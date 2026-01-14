import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConnectedUser {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface CollaboratorAvatarsProps {
  users: ConnectedUser[];
}

const COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
];

export function CollaboratorAvatars({ users }: CollaboratorAvatarsProps) {
  if (users.length === 0) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getColor = (id: string) => {
    const index = id.charCodeAt(0) % COLORS.length;
    return COLORS[index];
  };

  const displayUsers = users.slice(0, 5);
  const remainingCount = users.length - 5;

  return (
    <div className="flex items-center -space-x-2">
      {displayUsers.map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger>
            <Avatar className="h-8 w-8 border-2 border-background">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className={`${getColor(user.id)} text-white text-xs`}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{user.name}</TooltipContent>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="bg-muted text-xs">
                +{remainingCount}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            {users.slice(5).map(u => u.name).join(', ')}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
