import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BookImage,
  BookOpen,
  Bug,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  Flag,
  Folder,
  FolderInput,
  HardDrive,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Info,
  Lightbulb,
  Loader2,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  SendHorizontal,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  User,
  UserCircle,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';

/**
 * The catalog of icons the app has officially adopted, keyed by the concept
 * they represent rather than the lucide export name (e.g. `delete`, not
 * `trash2`), so the whole app converges on one icon per concept.
 *
 * Every entry here is already imported and bundled somewhere in the app, so
 * collecting them into one object doesn't pull in icons production doesn't
 * already ship - this is NOT the full lucide-react library, only the
 * subset the product uses. Do not import `* as icons from 'lucide-react'`
 * here; add icons one named import at a time so it stays obvious what's
 * actually part of the catalog.
 *
 * This registry doubles as the source of truth for the Storybook icon
 * gallery (see IconGallery.stories.tsx), which renders it directly instead
 * of maintaining a second, manually kept list.
 */
export const icons = {
  add: Plus,
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  bell: Bell,
  bookImage: BookImage,
  bookOpen: BookOpen,
  bug: Bug,
  calendar: Calendar,
  check: Check,
  checkCircle: CheckCircle,
  checkSquare: CheckSquare,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  circle: Circle,
  clock: Clock,
  close: X,
  creditCard: CreditCard,
  crown: Crown,
  delete: Trash2,
  download: Download,
  edit: Pencil,
  externalLink: ExternalLink,
  flag: Flag,
  folder: Folder,
  folderInput: FolderInput,
  hardDrive: HardDrive,
  heart: Heart,
  helpCircle: HelpCircle,
  info: Info,
  lightbulb: Lightbulb,
  lock: Lock,
  logOut: LogOut,
  mail: Mail,
  messageCircle: MessageCircle,
  moreOptions: MoreVertical,
  photo: ImageIcon,
  refresh: RefreshCw,
  send: Send,
  sendHorizontal: SendHorizontal,
  share: Share2,
  sparkles: Sparkles,
  spinner: Loader2,
  upload: Upload,
  user: User,
  userAdd: UserPlus,
  userCircle: UserCircle,
  userRemove: UserX,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;
