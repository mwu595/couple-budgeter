'use client'

import type { OwnerId, User } from '@/core/types'

interface OwnerAvatarProps {
  ownerId: OwnerId
  users: [User, User]
  size?: 'sm' | 'md'
}

export function OwnerAvatar({ ownerId, users, size = 'md' }: OwnerAvatarProps) {
  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'

  if (ownerId === 'shared') {
    // Overlapping duo avatars for shared
    return (
      <span
        className={`relative flex-shrink-0 ${size === 'sm' ? 'w-8' : 'w-10'}`}
        aria-label="Shared"
      >
        <span className={`absolute left-0 top-0 ${sizeClasses} rounded-full bg-muted flex items-center justify-center select-none border-2 border-background`}>
          {users[0].avatarEmoji}
        </span>
        <span className={`absolute ${size === 'sm' ? 'left-3' : 'left-4'} top-0 ${sizeClasses} rounded-full bg-muted flex items-center justify-center select-none border-2 border-background`}>
          {users[1].avatarEmoji}
        </span>
      </span>
    )
  }

  const user = ownerId === 'user_a' ? users[0] : users[1]

  return (
    <span
      className={`flex-shrink-0 ${sizeClasses} rounded-full bg-muted flex items-center justify-center select-none`}
      aria-label={user.name}
    >
      {user.avatarEmoji}
    </span>
  )
}
