import { auth, signOut } from "@/auth";
import Link from "next/link";
import Image from "next/image";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
        <Link href="/dashboard" className="flex items-center gap-1.5 font-semibold text-emerald-600 text-base sm:text-lg flex-shrink-0">
          💸 <span>Splitwise</span>
        </Link>

        {session?.user && (
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <Link href="/dashboard" className="hidden sm:block px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Dashboard
            </Link>
            <Link href="/groups" className="hidden sm:block px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Groups
            </Link>
            <Link href="/help" className="hidden sm:block px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Help
            </Link>

            {/* Mobile nav links */}
            <Link href="/dashboard" className="sm:hidden px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Home
            </Link>
            <Link href="/groups" className="sm:hidden px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Groups
            </Link>
            <Link href="/help" className="sm:hidden px-2 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md">
              Help
            </Link>

            <div className="ml-1 sm:ml-3 pl-2 sm:pl-3 border-l border-gray-200 flex items-center gap-1.5 sm:gap-2">
              {session.user.image && (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? ""}
                  width={26}
                  height={26}
                  className="rounded-full"
                />
              )}
              <form action={async () => { "use server"; await signOut({ redirectTo: "/signin" }); }}>
                <button type="submit" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 whitespace-nowrap">
                  Sign out
                </button>
              </form>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
