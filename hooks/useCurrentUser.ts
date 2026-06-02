import { useUser } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { User } from '../types';

export const useCurrentUser = () => {
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn } = useUser();

  const { data: dbUser, isLoading: isDbLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await api.get<{ user: User }>('/api/users/me');
      return response.data.user;
    },
    enabled: isSignedIn && !!clerkUser,
  });

  const isLoading = !isClerkLoaded || (isSignedIn && isDbLoading);

  const mergedUser = clerkUser && dbUser ? {
    ...dbUser,
    clerkId: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || dbUser.email,
    name: dbUser.name || clerkUser.fullName || '',
    avatarUrl: dbUser.avatarUrl || clerkUser.imageUrl,
  } : null;

  return {
    user: mergedUser,
    isLoading,
    isSignedIn,
    error,
  };
};
