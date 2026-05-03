import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductRatingProps {
  productId: string;
  currentRating: number;
  reviewsCount: number;
}

const ProductRating = ({ productId, currentRating, reviewsCount }: ProductRatingProps) => {
  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="font-semibold mb-4">Avaliações</h3>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl font-bold text-foreground">{currentRating.toFixed(1)}</div>
        <div>
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= Math.round(currentRating)
                    ? "text-yellow-400 fill-current"
                    : "text-muted-foreground"
                )}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {reviewsCount} {reviewsCount === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>
      </div>

      {reviewsCount === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Seja o primeiro a avaliar este produto!
        </p>
      )}
    </div>
  );
};

export default ProductRating;
