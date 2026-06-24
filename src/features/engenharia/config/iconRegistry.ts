import {
  AlertTriangle, AlertCircle, CheckCircle2, Clock, Wrench, ShieldCheck,
  Activity, ClipboardList, ClipboardCheck, ClipboardX, Hammer, Calendar,
  TrendingUp, TrendingDown, Users, User, Building2, Gauge, Target,
  PieChart, BarChart3, FileText, Zap, ThumbsUp, ThumbsDown, Star,
  type LucideIcon,
} from "lucide-react";

// Mapa string→ícone. Para adicionar um novo ícone configurável,
// basta incluí-lo aqui — nenhum componente precisa mudar.
export const ICON_REGISTRY = {
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  "check-circle": CheckCircle2,
  "clock": Clock,
  "wrench": Wrench,
  "shield-check": ShieldCheck,
  "activity": Activity,
  "clipboard-list": ClipboardList,
  "clipboard-check": ClipboardCheck,
  "clipboard-x": ClipboardX,
  "hammer": Hammer,
  "calendar": Calendar,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,
  "users": Users,
  "user": User,
  "building": Building2,
  "gauge": Gauge,
  "target": Target,
  "pie-chart": PieChart,
  "bar-chart": BarChart3,
  "file-text": FileText,
  "zap": Zap,
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  "star": Star,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICON_REGISTRY;

export const ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[];

export function resolveIcon(key: string | undefined, fallback: IconKey = "activity"): LucideIcon {
  if (key && key in ICON_REGISTRY) return ICON_REGISTRY[key as IconKey];
  return ICON_REGISTRY[fallback];
}