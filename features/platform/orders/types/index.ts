// Order types
export interface Order {
  id: string;
  displayId: string;
  status: string;
  email: string;
  createdAt: string;
  subtotal?: string;
  shipping?: string;
  tax?: string;
  total?: string;
  formattedTotalPaid?: string;
  paymentDetails?: Array<{
    status: string;
  }>;
  user?: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
    orders?: { id: string }[];
  };
  shippingAddress?: {
    id: string;
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    phone?: string;
    country?: { name: string };
  };
  lineItems?: Array<{
    id: string;
    title: string;
    quantity: number;
    sku?: string;
    thumbnail?: string;
    formattedUnitPrice?: string;
    formattedTotal?: string;
    variantTitle?: string;
    variantData?: any;
    productData?: any;
  }>;
  events?: Array<{
    id: string;
    type: string;
    createdAt: string;
    user?: { name: string };
  }>;
  unfulfilled?: Array<{
    id: string;
    title: string;
    quantity: number;
    sku?: string;
    thumbnail?: string;
    formattedUnitPrice?: string;
    formattedTotal?: string;
    variantTitle?: string;
  }>;
  fulfillmentDetails?: Array<{
    id: string;
    createdAt: string;
    canceledAt?: string;
    items?: Array<{
      id: string;
      quantity: number;
      lineItem: {
        title: string;
        variantTitle?: string;
        sku?: string;
        thumbnail?: string;
        formattedUnitPrice: string;
      };
    }>;
    shippingLabels?: Array<{
      id: string;
      carrier?: string;
      trackingNumber?: string;
      trackingUrl?: string;
      labelUrl?: string;
    }>;
  }>;
}

// Unfulfilled Items types
export interface UnfulfilledItem {
  id: string;
  title: string;
  quantity: number;
  sku?: string;
  thumbnail?: string;
  formattedUnitPrice?: string;
  formattedTotal?: string;
  variantTitle?: string;
}

export interface UnfulfilledItemProps {
  item: UnfulfilledItem;
  selected: boolean;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

export interface UnfulfilledItemsProps {
  items: UnfulfilledItem[];
  selectedQuantities: Record<string, string>;
  setSelectedQuantities: (quantities: Record<string, string>) => void;
  order?: Order;
}

// Fulfillment History types
export interface FulfillmentHistoryOrder {
  id: string;
  unfulfilled?: Array<{
    id: string;
    quantity: number;
  }>;
}

export interface FulfillmentHistoryFulfillment {
  id: string;
  createdAt: string;
  canceledAt?: string;
  items?: Array<{
    id: string;
    quantity: number;
    lineItem: {
      title: string;
      variantTitle?: string;
      sku?: string;
      thumbnail?: string;
      formattedUnitPrice: string;
    };
  }>;
  shippingLabels?: Array<{
    id: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    labelUrl?: string;
  }>;
}

export interface FulfillmentHistoryProps {
  fulfillments: FulfillmentHistoryFulfillment[];
  order: FulfillmentHistoryOrder;
  onDelete: (id: string) => void;
}

export interface Dimensions {
  length: string;
  width: string;
  height: string;
  unit: 'in' | 'cm';
}

export interface Weight {
  value: string;
  unit: 'oz' | 'lb' | 'kg';
}

export interface ShippingProviderAddress {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  country?: {
    iso2?: string | null;
    name?: string | null;
  } | null;
}

export interface ShippingProvider {
  id: string;
  name: string;
  isActive?: boolean | null;
  accessToken?: string | null;
  metadata?: Record<string, any> | null;
  fromAddress?: ShippingProviderAddress | null;
}

export interface ShippingRate {
  id: string;
  provider?: string | null;
  service: string;
  carrier: string;
  price: string;
  estimatedDays: string;
} 