import {
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  X,
  Star,
  TriangleAlert,
  Pencil,
  MessageCircle,
  Clapperboard,
  Image,
  FileText,
  BookOpen,
  Dices,
  Sparkles,
  Hand,
  CalendarDays,
  Clock,
  Play,
  Music,
  UserRound,
} from "lucide-react";

const icons = {
  right: ArrowRight,
  left: ArrowLeft,
  up: ArrowUp,
  down: ArrowDown,
  upRight: ArrowUpRight,
  downRight: ArrowDownRight,
  check: Check,
  close: X,
  star: Star,
  warning: TriangleAlert,
  edit: Pencil,
  message: MessageCircle,
  video: Clapperboard,
  image: Image,
  document: FileText,
  book: BookOpen,
  dice: Dices,
  sparkles: Sparkles,
  greeting: Hand,
  calendar: CalendarDays,
  clock: Clock,
  play: Play,
  music: Music,
  person: UserRound,
};

export default function UiSymbol({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      className="mx-[0.15em] inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em]"
      strokeWidth={1.8}
    />
  );
}
