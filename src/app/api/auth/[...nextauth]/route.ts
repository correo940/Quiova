sameSite: 'lax',
  path: '/',
    secure: process.env.NODE_ENV === 'production',
                      },
                    },
                  },
                };

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };