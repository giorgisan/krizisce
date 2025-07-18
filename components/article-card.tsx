import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, ExternalLink } from "lucide-react";
import { useState } from "react";

interface Article {
  id: number;
  title: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
  excerpt?: string;
  category?: string;
  viewCount: number;
}

interface ArticleCardProps {
  article: Article;
  onView: () => void;
}

const getSourceColor = (source: string) => {
  switch (source) {
    case "Slovenske novice":
      return "bg-blue-50 text-blue-700";
    case "Delo":
      return "bg-orange-50 text-orange-700";
    case "RTVSLO":
      return "bg-red-50 text-red-700";
    case "24ur":
      return "bg-green-50 text-green-700";
    case "Zurnal24":
      return "bg-purple-50 text-purple-700";
    case "Siol.net":
      return "bg-cyan-50 text-cyan-700";
    default:
      return "bg-gray-50 text-gray-700";
  }
};

export default function ArticleCard({ article, onView }: ArticleCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("sl-SI", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatViewCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const handleClick = () => {
    onView();
    window.open(article.url, '_blank');
  };

  return (
    <Card className="group overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer bg-card border-border/50 hover:border-border">
      <div className="relative">
        {article.imageUrl && !imageError ? (
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-48 bg-muted/50 flex items-center justify-center">
            <span className="text-muted-foreground">Ni slike</span>
          </div>
        )}
        
        {article.category && (
          <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground shadow-lg">
            {article.category}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary" className={`text-xs font-medium ${getSourceColor(article.source)}`}>
            {article.source}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateTime(article.publishedAt)}
          </span>
        </div>
        
        <h3 className="font-semibold text-card-foreground mb-2 leading-snug group-hover:text-primary transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {article.excerpt}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formatViewCount(article.viewCount)}
              </span>
            </div>
            {(article as any).commentsCount > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">💬</span>
                <span className="text-xs text-muted-foreground">
                  {(article as any).commentsCount}
                </span>
              </div>
            )}
            {(article as any).sharesCount > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-muted-foreground">📤</span>
                <span className="text-xs text-muted-foreground">
                  {(article as any).sharesCount}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleClick}
            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center space-x-1 transition-colors"
          >
            <span>Preberi več</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
