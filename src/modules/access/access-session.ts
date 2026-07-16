export type AccessActionResult =
  | { status: 'success' }
  | { status: 'unavailable' };

export type AccessSession = {
  status: 'loading' | 'signed-out' | 'signed-in';
  signOut: () => Promise<AccessActionResult>;
};
