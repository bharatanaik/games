import { useState } from "react"
import { useNavigate } from "react-router"
import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateLobbyId } from "@/utils/generateLobbyId"
import { get, ref, set } from "firebase/database"

export default function Lobby() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [roomCode, setRoomCode] = useState("")
    const [loading, setLoading] = useState(false)

    const createRoom = async () => {
        setLoading(true)

        let roomId = generateLobbyId(4)
        let roomRef = ref(rtdb, `rooms/${roomId}`)

        while ((await get(roomRef)).exists()) {
            roomId = generateLobbyId(4)
            roomRef = ref(rtdb, `rooms/${roomId}`)
        }

        await set(roomRef, {
            status: "lobby",
            hostId: user!.uid,
            players: {
                [user!.uid]: {
                    name: user!.displayName || "Player",
                    score: 0,
                },
            },
        })

        navigate(`/lobby/${roomId}`)
    }

    const joinRoom = () => {
        if (!roomCode) return
        navigate(`/lobby/${roomCode.toUpperCase()}`)
    }

    return (
        <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-6">
            <Card className="neo bg-white w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-black text-center">
                        Bingo Lobby
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                    <Button
                        disabled={loading}
                        onClick={createRoom}
                        className="neo w-full bg-green-400 text-black font-black"
                    >
                        {loading ? "Creating..." : "Create Room"}
                    </Button>

                    <div className="space-y-2">
                        <Input
                            placeholder="Enter Room ID"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            className="neo"
                        />
                        <Button
                            onClick={joinRoom}
                            className="neo w-full bg-blue-400 text-black font-black"
                        >
                            Join Room
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
