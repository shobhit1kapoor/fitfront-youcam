"use client";

/* eslint-disable @next/next/no-img-element -- Blob previews and two-hour provider URLs cannot use the Next image optimizer safely. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Download,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Shirt,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getDemoImageForCategory,
  getGarmentCategory,
} from "@/features/youcam/catalog";
import type { TryOnPollResponse, TryOnStatus } from "@/features/youcam/types";
import { MAX_IMAGE_BYTES } from "@/features/youcam/validation";
import { cn } from "@/lib/utils";

type VirtualTryOnProps = {
  product: {
    id: string;
    title: string;
    handle?: string | null;
    productOptions?: Array<{
      id: string;
      title: string;
      productOptionValues?: Array<{ value?: string | null }> | null;
    }> | null;
  };
  variant?: { id?: string; title?: string | null } | null;
  selectedOptions?: Record<string, string | undefined>;
  onVariantOptionChange?: (update: Record<string, string>) => void;
  onAddToCart: () => Promise<unknown> | unknown;
  cartDisabled?: boolean;
};

type Screen = "photo" | "consent" | "result";
type SourceChoice = "demo" | "upload";

export default function VirtualTryOn({
  product,
  variant,
  selectedOptions,
  onVariantOptionChange,
  onAddToCart,
  cartDisabled,
}: VirtualTryOnProps) {
  const garmentCategory = getGarmentCategory(product);
  const demoImage = getDemoImageForCategory(garmentCategory || "upper_body");
  const storageKey = `fitfront:vto:${product.id}`;
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>("photo");
  const [choice, setChoice] = useState<SourceChoice>("demo");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(demoImage.path);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const pollingTask = useRef<string | null>(null);
  const mounted = useRef(true);

  const supported = Boolean(garmentCategory);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (choice !== "upload" || !file) {
      setPreviewUrl(demoImage.path);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [choice, demoImage.path, file]);

  useEffect(() => {
    const savedTask = window.sessionStorage.getItem(storageKey);
    if (!savedTask) return;
    const savedSource = window.sessionStorage.getItem(`${storageKey}:source`);
    if (savedSource === "demo") {
      setChoice("demo");
      setPreviewUrl(demoImage.path);
    }
    setTaskId(savedTask);
    setScreen("result");
    setStatus("running");
    void pollTask(savedTask);
    // The product-specific key is stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  if (!supported) return null;

  async function advanceToConsent() {
    setMessage(null);
    setStatus("validating");
    try {
      if (choice === "upload") {
        if (!file) throw new Error("Choose a JPG or PNG photo first.");
        await validateBrowserImage(file);
      }
      setScreen("consent");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Choose another photo.",
      );
    }
  }

  async function startTryOn() {
    if (!consent) {
      setMessage("Confirm the photo-retention disclosure before continuing.");
      return;
    }
    setScreen("result");
    setStatus("uploading");
    setMessage(null);
    setResultUrl(null);

    try {
      const body = new FormData();
      body.set("productId", product.id);
      if (variant?.id) body.set("variantId", variant.id);
      body.set("consent", "true");
      if (choice === "demo") {
        body.set("demoImageId", demoImage.id);
      } else if (file) {
        body.set("sourceImage", file);
      }

      const response = await fetch("/api/youcam/try-on", {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok || !payload.taskId) {
        throw new Error(payload.message || "The try-on could not be started.");
      }
      const newTaskId = String(payload.taskId);
      setTaskId(newTaskId);
      setStatus("running");
      window.sessionStorage.setItem(storageKey, newTaskId);
      window.sessionStorage.setItem(`${storageKey}:source`, choice);
      await pollTask(newTaskId);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The try-on could not be started.",
      );
    }
  }

  async function pollTask(id: string) {
    if (pollingTask.current === id) return;
    pollingTask.current = id;
    try {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        if (attempt > 0) await wait(5000);
        const response = await fetch(
          `/api/youcam/try-on/${encodeURIComponent(id)}`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as TryOnPollResponse;
        if (!response.ok || payload.status === "error") {
          throw new Error(
            payload.message || "The try-on could not be completed.",
          );
        }
        if (payload.status === "success" && payload.resultUrl) {
          if (!mounted.current) return;
          setResultUrl(payload.resultUrl);
          setStatus("success");
          setMessage(null);
          window.sessionStorage.removeItem(storageKey);
          window.sessionStorage.removeItem(`${storageKey}:source`);
          return;
        }
      }
      if (mounted.current) {
        setStatus("error");
        setMessage(
          "This task is still processing. Use “Check again” to continue polling without spending more units.",
        );
      }
    } catch (error) {
      if (mounted.current) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The try-on could not be completed.",
        );
      }
    } finally {
      pollingTask.current = null;
    }
  }

  function resetForRetry() {
    if (taskId) window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(`${storageKey}:source`);
    setTaskId(null);
    setResultUrl(null);
    setStatus("idle");
    setMessage(null);
    setConsent(false);
    setScreen("photo");
  }

  async function addToCart() {
    setAdding(true);
    try {
      await onAddToCart();
      setOpen(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full border-violet-300 bg-violet-50 text-violet-950 hover:bg-violet-100"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="text-violet-600" />
        Try it on with YouCam
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <div className="border-b bg-gradient-to-r from-violet-50 via-white to-cyan-50 px-6 py-5 pr-12">
            <DialogHeader>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                <Shirt className="size-4" /> FitFront virtual fitting room
              </div>
              <DialogTitle className="text-2xl">
                Try on {product.title}
              </DialogTitle>
              <DialogDescription>
                Visualize the style on you, then continue with the selected
                variant.
              </DialogDescription>
            </DialogHeader>
            <StepIndicator screen={screen} />
          </div>

          <div className="px-6 py-6">
            {screen === "photo" && (
              <PhotoStep
                choice={choice}
                file={file}
                previewUrl={previewUrl}
                demoImagePath={demoImage.path}
                needsFullBody={demoImage.needsFullBody}
                message={message}
                validating={status === "validating"}
                onChoice={setChoice}
                onFile={setFile}
                onNext={advanceToConsent}
              />
            )}

            {screen === "consent" && (
              <ConsentStep
                previewUrl={previewUrl}
                consent={consent}
                message={message}
                onConsent={setConsent}
                onBack={() => {
                  setMessage(null);
                  setScreen("photo");
                }}
                onGenerate={startTryOn}
              />
            )}

            {screen === "result" && (
              <ResultStep
                sourceUrl={previewUrl}
                resultUrl={resultUrl}
                status={status}
                message={message}
                hasTask={Boolean(taskId)}
                cartDisabled={Boolean(cartDisabled || !variant?.id)}
                adding={adding}
                productOptions={product.productOptions || []}
                selectedOptions={selectedOptions || {}}
                onVariantOptionChange={onVariantOptionChange}
                onCheckAgain={() => taskId && pollTask(taskId)}
                onRetry={resetForRetry}
                onAddToCart={addToCart}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StepIndicator({ screen }: { screen: Screen }) {
  const active = screen === "photo" ? 1 : screen === "consent" ? 2 : 3;
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Try-on progress">
      {["Photo", "Privacy", "Result"].map((label, index) => {
        const step = index + 1;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium",
              step === active
                ? "border-violet-300 bg-violet-100 text-violet-950"
                : step < active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-zinc-200 bg-white text-zinc-500",
            )}
            aria-current={step === active ? "step" : undefined}
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-white">
              {step < active ? <Check className="size-3" /> : step}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}

function PhotoStep({
  choice,
  file,
  previewUrl,
  demoImagePath,
  needsFullBody,
  message,
  validating,
  onChoice,
  onFile,
  onNext,
}: {
  choice: SourceChoice;
  file: File | null;
  previewUrl: string;
  demoImagePath: string;
  needsFullBody: boolean;
  message: string | null;
  validating: boolean;
  onChoice: (choice: SourceChoice) => void;
  onFile: (file: File | null) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoice("demo")}
          className={cn(
            "rounded-xl border-2 p-3 text-left transition",
            choice === "demo"
              ? "border-violet-500 bg-violet-50"
              : "border-zinc-200 hover:border-zinc-300",
          )}
          aria-pressed={choice === "demo"}
        >
          <img
            src={demoImagePath}
            alt="FitFront demo model facing the camera"
            className="h-52 w-full rounded-lg bg-zinc-100 object-contain"
          />
          <span className="mt-3 flex items-center gap-2 font-semibold">
            <ImageIcon className="size-4" /> Use demo model
          </span>
          <span className="mt-1 block text-sm text-zinc-600">
            Fastest way for judges to test the complete experience.
          </span>
        </button>

        <label
          className={cn(
            "cursor-pointer rounded-xl border-2 p-3 transition",
            choice === "upload"
              ? "border-violet-500 bg-violet-50"
              : "border-zinc-200 hover:border-zinc-300",
          )}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => {
              onChoice("upload");
              onFile(event.target.files?.[0] || null);
            }}
          />
          <div className="flex h-52 items-center justify-center overflow-hidden rounded-lg bg-zinc-100">
            {choice === "upload" && file ? (
              <img
                src={previewUrl}
                alt="Your selected try-on preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <Upload className="size-10 text-zinc-400" />
            )}
          </div>
          <span className="mt-3 flex items-center gap-2 font-semibold">
            <Upload className="size-4" /> Upload your photo
          </span>
          <span className="mt-1 block text-sm text-zinc-600">
            JPG or PNG, under 10 MB. One person, front-facing,
            {needsFullBody
              ? " visible from head to feet with legs unobstructed."
              : " with face, shoulders, and torso visible."}
          </span>
        </label>
      </div>
      {message && <InlineError message={message} />}
      <DialogFooter>
        <Button type="button" onClick={onNext} disabled={validating}>
          {validating && <LoaderCircle className="animate-spin" />}
          Review privacy
        </Button>
      </DialogFooter>
    </div>
  );
}

function ConsentStep({
  previewUrl,
  consent,
  message,
  onConsent,
  onBack,
  onGenerate,
}: {
  previewUrl: string;
  consent: boolean;
  message: string | null;
  onConsent: (value: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <img
        src={previewUrl}
        alt="Photo selected for virtual try-on"
        className="h-72 w-full rounded-xl bg-zinc-100 object-contain"
      />
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">
            Before your photo leaves this browser
          </h3>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-600">
            <li>
              The image is sent to Perfect Corp&apos;s YouCam API for this
              try-on.
            </li>
            <li>
              FitFront does not store the photo or generated image in its
              database.
            </li>
            <li>
              YouCam may retain uploaded and generated files for up to 30 days.
            </li>
            <li>The generated download link lasts about two hours.</li>
          </ul>
        </div>
        <label className="flex cursor-pointer gap-3 rounded-lg border bg-zinc-50 p-4 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => onConsent(event.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            I consent to sending this image to Perfect Corp for virtual try-on
            processing.
          </span>
        </label>
        {message && <InlineError message={message} />}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onGenerate} disabled={!consent}>
            <Sparkles /> Generate my try-on
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResultStep({
  sourceUrl,
  resultUrl,
  status,
  message,
  hasTask,
  cartDisabled,
  adding,
  productOptions,
  selectedOptions,
  onVariantOptionChange,
  onCheckAgain,
  onRetry,
  onAddToCart,
}: {
  sourceUrl: string;
  resultUrl: string | null;
  status: TryOnStatus;
  message: string | null;
  hasTask: boolean;
  cartDisabled: boolean;
  adding: boolean;
  productOptions: Array<{
    id: string;
    title: string;
    productOptionValues?: Array<{ value?: string | null }> | null;
  }>;
  selectedOptions: Record<string, string | undefined>;
  onVariantOptionChange?: (update: Record<string, string>) => void;
  onCheckAgain: () => void;
  onRetry: () => void;
  onAddToCart: () => void;
}) {
  if (status === "uploading" || status === "running") {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center text-center">
        <div className="relative flex size-20 items-center justify-center rounded-full bg-violet-100">
          <LoaderCircle className="size-10 animate-spin text-violet-700" />
          <Sparkles className="absolute -right-1 top-0 size-6 text-cyan-500" />
        </div>
        <h3 className="mt-6 text-xl font-semibold">
          {status === "uploading"
            ? "Preparing your fitting room"
            : "YouCam is styling your look"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-zinc-600">
          Keep this window open. FitFront checks the same task every five
          seconds and never spends units by silently starting another one.
        </p>
      </div>
    );
  }

  if (status === "success" && resultUrl) {
    return (
      <div className="space-y-5">
        <BeforeAfter sourceUrl={sourceUrl} resultUrl={resultUrl} />
        {productOptions.length > 0 && onVariantOptionChange && (
          <VariantControls
            options={productOptions}
            selected={selectedOptions}
            onChange={onVariantOptionChange}
          />
        )}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          AI visualization only — color, drape, sizing, and physical fit may
          differ in real life. If a variant changes the garment&apos;s
          appearance, generate a new preview before relying on it.
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onRetry}>
              <RefreshCw /> Try another photo
            </Button>
            <Button asChild type="button" variant="outline">
              <a href={resultUrl} target="_blank" rel="noreferrer" download>
                <Download /> Download look
              </a>
            </Button>
          </div>
          <Button
            type="button"
            onClick={onAddToCart}
            disabled={cartDisabled || adding}
          >
            {adding && <LoaderCircle className="animate-spin" />}
            {cartDisabled ? "Select a variant first" : "Add this look to cart"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <div className="rounded-full bg-rose-100 p-4 text-rose-700">
        <RefreshCw className="size-8" />
      </div>
      <h3 className="mt-5 text-lg font-semibold">
        The fitting room needs attention
      </h3>
      <p className="mt-2 max-w-md text-sm text-zinc-600">{message}</p>
      <div className="mt-6 flex gap-3">
        {hasTask && (
          <Button type="button" variant="outline" onClick={onCheckAgain}>
            Check again
          </Button>
        )}
        <Button type="button" onClick={onRetry}>
          Choose another photo
        </Button>
      </div>
    </div>
  );
}

function VariantControls({
  options,
  selected,
  onChange,
}: {
  options: Array<{
    id: string;
    title: string;
    productOptionValues?: Array<{ value?: string | null }> | null;
  }>;
  selected: Record<string, string | undefined>;
  onChange: (update: Record<string, string>) => void;
}) {
  return (
    <fieldset className="rounded-xl border p-4">
      <legend className="px-1 text-sm font-semibold">
        Choose the cart variant
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const values = [
            ...new Set(
              (option.productOptionValues || [])
                .map((entry) => entry.value)
                .filter((value): value is string => Boolean(value)),
            ),
          ];
          return (
            <label key={option.id} className="text-sm font-medium">
              {option.title}
              <select
                value={selected[option.id] || ""}
                onChange={(event) =>
                  onChange({ [option.id]: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 font-normal"
              >
                <option value="" disabled>
                  Select {option.title.toLowerCase()}
                </option>
                {values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function BeforeAfter({
  sourceUrl,
  resultUrl,
}: {
  sourceUrl: string;
  resultUrl: string;
}) {
  const [position, setPosition] = useState(50);
  const label = useMemo(() => `${position}% result visible`, [position]);
  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] max-h-[62vh] overflow-hidden rounded-xl bg-zinc-100">
        <img
          src={sourceUrl}
          alt="Original photo before virtual try-on"
          className="absolute inset-0 size-full object-contain"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img
            src={resultUrl}
            alt="YouCam virtual try-on result"
            className="absolute inset-0 size-full object-contain"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow"
          style={{ left: `${position}%` }}
        />
        <span className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-xs text-white">
          Before
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-violet-700/90 px-3 py-1 text-xs text-white">
          YouCam result
        </span>
      </div>
      <label className="mt-3 block text-sm font-medium">
        Compare before and after
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(event) => setPosition(Number(event.target.value))}
          className="mt-2 w-full accent-violet-600"
          aria-label={label}
        />
      </label>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
    >
      {message}
    </p>
  );
}

async function validateBrowserImage(file: File) {
  if (!/image\/(jpeg|png)/.test(file.type)) {
    throw new Error("Choose a JPG or PNG image.");
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be smaller than 10 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("The image could not be read."));
        image.src = url;
      },
    );
    const shortSide = Math.min(dimensions.width, dimensions.height);
    const longSide = Math.max(dimensions.width, dimensions.height);
    if (shortSide < 384 || longSide < 512) {
      throw new Error("Use an image of at least 512 × 384 pixels.");
    }
    if (longSide > 4096) {
      throw new Error("The longest image side must not exceed 4096 pixels.");
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
