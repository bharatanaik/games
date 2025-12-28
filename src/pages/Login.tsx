import { useState } from "react"
import { auth, googleProvider } from "@/lib/firebase"
import {
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link, useNavigate } from "react-router"

export default function Login() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)

    const handleLogin = async () => {
        setLoading(true)
        setError("")

        try {
            await signInWithEmailAndPassword(auth, email, password)
            navigate("/")
        } catch {
            setError("Invalid email or password")
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        setLoading(true)
        await signInWithPopup(auth, googleProvider)
        navigate("/")
    }


    return (
        <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-6">
            <Card className="neo bg-white w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-black">
                        Login
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {error && (
                        <p className="text-red-600 font-bold text-sm">{error}</p>
                    )}

                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            className="neo"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                            type="password"
                            className="neo"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <Button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-green-400 text-black font-black"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </Button>


                    <Button
                        onClick={handleGoogleLogin}
                        className="neo w-full bg-blue-400 text-black font-black"
                    >
                        Continue with Google
                    </Button>
                    <div className="text-center pt-4 border-t-4 border-black">
                        <p className="font-bold text-sm">
                            Not registered yet?
                        </p>
                        <Link
                            to="/signup"
                            className="inline-block mt-2 font-black underline underline-offset-4"
                        >
                            Create an account
                        </Link>
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
