import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  brand: string;
  rating: number;
  reviews: number;
  discount?: number;
  isNew?: boolean;
}

interface CartItem extends Product {
  quantity: number;
  selectedVariants?: Record<string, string>;
  cartKey: string; // unique key: productId or productId__variant1:val1__variant2:val2
}

interface CartState {
  items: CartItem[];
  establishmentSlug: string | null;
}

type CartAction =
  | { type: 'ADD_ITEM'; product: Product; selectedVariants?: Record<string, string> }
  | { type: 'REMOVE_ITEM'; cartKey: string }
  | { type: 'UPDATE_QUANTITY'; cartKey: string; quantity: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ESTABLISHMENT'; slug: string | null };

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, selectedVariants?: Record<string, string>) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  placeOrder: (orderData: any) => Promise<{ success: boolean; orderId?: string; error?: string }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function buildCartKey(productId: string, selectedVariants?: Record<string, string>): string {
  if (!selectedVariants || Object.keys(selectedVariants).length === 0) {
    return productId;
  }
  const sortedEntries = Object.entries(selectedVariants).sort(([a], [b]) => a.localeCompare(b));
  const variantStr = sortedEntries.map(([k, v]) => `${k}:${v}`).join('__');
  return `${productId}__${variantStr}`;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const cartKey = buildCartKey(action.product.id, action.selectedVariants);
      const existingItem = state.items.find(item => item.cartKey === cartKey);
      
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.cartKey === cartKey
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      } else {
        return {
          ...state,
          items: [...state.items, { 
            ...action.product, 
            quantity: 1, 
            selectedVariants: action.selectedVariants,
            cartKey 
          }],
        };
      }
    }

    case 'REMOVE_ITEM': {
      return {
        ...state,
        items: state.items.filter(item => item.cartKey !== action.cartKey),
      };
    }

    case 'UPDATE_QUANTITY': {
      return {
        ...state,
        items: state.items.map(item =>
          item.cartKey === action.cartKey
            ? { ...item, quantity: Math.max(0, action.quantity) }
            : item
        ).filter(item => item.quantity > 0),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    case 'SET_ESTABLISHMENT':
      if (action.slug !== state.establishmentSlug) {
        return { items: [], establishmentSlug: action.slug };
      }
      return state;

    default:
      return state;
  }
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], establishmentSlug: null });
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useLocation();
  const previousSlugRef = useRef<string | null>(null);

  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    let currentSlug: string | null = null;
    
    if (pathParts[0] === 'loja' && pathParts[1]) {
      currentSlug = pathParts[1];
    }
    
    if (currentSlug !== previousSlugRef.current) {
      dispatch({ type: 'SET_ESTABLISHMENT', slug: currentSlug });
      previousSlugRef.current = currentSlug;
    }
  }, [location.pathname]);

  const addItem = (product: Product, selectedVariants?: Record<string, string>) => {
    dispatch({ type: 'ADD_ITEM', product, selectedVariants });
  };

  const removeItem = (cartKey: string) => {
    dispatch({ type: 'REMOVE_ITEM', cartKey });
  };

  const updateQuantity = (cartKey: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', cartKey, quantity });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const getTotalPrice = () => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  };

  const placeOrder = async (orderData: any): Promise<{ success: boolean; orderId?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Você precisa estar logado para fazer um pedido.' };
    }

    try {
      const subtotal = getTotalPrice();
      const deliveryFee = orderData.deliveryFee || 0;
      const discount = orderData.couponDiscount || orderData.discount || 0;
      const total = subtotal + deliveryFee - discount;

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          establishment_id: orderData.establishment_id,
          status: 'pending',
          total,
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          payment_method: orderData.paymentMethod,
          delivery_address: orderData.address,
          notes: orderData.notes,
          cash_amount: orderData.cashAmount || null,
          order_observations: orderData.orderObservations || null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = state.items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        specifications: item.selectedVariants && Object.keys(item.selectedVariants).length > 0 
          ? item.selectedVariants 
          : null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      
      toast({
        title: "Pedido realizado!",
        description: "Seu pedido foi enviado com sucesso.",
      });

      return { success: true, orderId: order.id };
    } catch (error: any) {
      console.error('Error placing order:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <CartContext.Provider value={{
      items: state.items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems,
      placeOrder
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
