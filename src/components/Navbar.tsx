import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'


export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="bg-white mb-8">
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between">
        <Link to="/" className="text-2xl font-black">
          GameNight
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <>
            <Avatar>
                {user.photoURL && 
                    <AvatarImage src={user?.photoURL} alt="@shadcn" />
                }
                {
                    user.displayName &&
                    <AvatarFallback>
                        {user?.displayName.substring(0, 1)}
                    </AvatarFallback>

                }
            </Avatar>


              <span className="font-bold">
                Hi, {user.displayName || "Player"}
              </span>

              <Button
                onClick={logout}
                className="bg-red-400 text-black font-black border-4 border-black"
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button className="border-4 border-black">
                  Login
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-black text-white border-4 border-black">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
