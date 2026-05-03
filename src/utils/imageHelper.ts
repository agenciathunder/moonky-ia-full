export const getProductImage = (imageUrl?: string | null): string => {
  if (!imageUrl) {
    return '/placeholder.svg';
  }
  return imageUrl;
};
