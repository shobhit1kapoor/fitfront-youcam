import { Metadata } from "next"

import FeaturedProducts from "@/features/storefront/modules/home/components/featured-products"
import Hero from "@/features/storefront/modules/home/components/hero"
import { getCollectionsListByRegion } from "@/features/storefront/lib/data/collections"
import { getRegion } from "@/features/storefront/lib/data/regions"
import { getStore } from "@/features/storefront/lib/data/store"
import type { StoreCollection, StoreRegion } from "@/features/storefront/types/storefront"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "FitFront — See the look before you cart it",
    description:
      "Try supported apparel with YouCam, compare the result, and continue directly to your cart.",
  }
}

export async function HomePage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const region: StoreRegion | undefined = await getRegion(countryCode)
  const store = await getStore()

  const { collections }: { collections: StoreCollection[] } = region
    ? await getCollectionsListByRegion(0, 3, region.id)
    : { collections: [] }

  if (!collections || !region) {
    return null
  }

  return (
    <>
      <Hero
        title="See the look before you cart it."
        description="FitFront turns product pages into a private virtual fitting room—try a style, compare the result, and keep shopping with confidence."
        logoColor={store?.logoColor}
      />
      <div className="py-12">
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </>
  )
}
