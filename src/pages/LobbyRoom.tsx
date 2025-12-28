import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"

import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { onValue, ref, update, get } from "firebase/database"

type Player = {
    id: string
    name: string
}

export default function LobbyRoom() {
    const { roomId } = useParams()
    const { user } = useAuth()
    const navigate = useNavigate()

    const [players, setPlayers] = useState<Player[]>([])
    const [hostId, setHostId] = useState<string>("")
    const [isLoading, setIsLoading] = useState(false)

    // Join room and listen for changes
    useEffect(() => {
        if (!roomId || !user) return

        const roomRef = ref(rtdb, `rooms/${roomId}`)

        // Check if room exists first
        get(roomRef).then((snapshot) => {
            if (!snapshot.exists()) {
                alert("Room not found!")
                navigate("/lobby")
                return
            }

            // Join room by adding/updating player
            update(ref(rtdb, `rooms/${roomId}/players/${user.uid}`), {
                name: user.displayName || "Player",
                score: 0,
            })
        })

        // Listen for room updates
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val()
            
            if (!data) {
                navigate("/lobby")
                return
            }

            setHostId(data.hostId)

            const playerList = Object.entries(data.players || {}).map(
                ([id, value]: any) => ({
                    id,
                    name: value.name,
                })
            )

            setPlayers(playerList)

            // Auto-navigate when game starts
            if (data.status === "playing") {
                navigate(`/bingo/${roomId}`)
            }
        })

        return () => unsubscribe()
    }, [roomId, user, navigate])

    const startGame = async () => {
        if (players.length < 2) {
            alert("Need at least 2 players to start!")
            return
        }

        setIsLoading(true)

        try {
            const playerIds = players.map((p) => p.id)

            // Generate boards for all players
            const updates: any = {
                status: "playing",
                turnOrder: playerIds,
                currentTurnIndex: 0,
                drawnNumbers: [],
                lastCalledNumber: null,
                round: 1,
            }

            // Create a board for each player
            playerIds.forEach((uid) => {
                // Generate unique random numbers 1-25 for this player
                const numbers = Array.from({ length: 25 }, (_, i) => i + 1)
                    .sort(() => Math.random() - 0.5)

                const board = numbers.map((n) => ({
                    number: n,
                    marked: false,
                }))

                updates[`players/${uid}/board`] = board
                updates[`players/${uid}/bingoCount`] = 0
            })

            await update(ref(rtdb, `rooms/${roomId}`), updates)
        } catch (error) {
            console.error("Error starting game:", error)
            alert("Failed to start game. Please try again.")
            setIsLoading(false)
        }
    }

    const copyRoomCode = () => {
        if (roomId) {
            navigator.clipboard.writeText(roomId)
            alert("Room code copied!")
        }
    }

    const isHost = user?.uid === hostId

    return (
        <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-6">
            <Card className="neo bg-white w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl font-black text-center">
                        Waiting Room
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Room Code */}
                    <div 
                        className="neo p-3 bg-gray-100 font-bold text-center cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={copyRoomCode}
                        title="Click to copy"
                    >
                        <div className="text-xs text-gray-600 mb-1">Room Code (click to copy)</div>
                        <div className="text-2xl font-black tracking-wider">{roomId}</div>
                    </div>

                    {/* Player List */}
                    <div className="space-y-2">
                        <div className="font-black text-sm text-gray-600 mb-2">
                            Players ({players.length})
                        </div>
                        {players.map((p) => (
                            <div
                                key={p.id}
                                className={`neo bg-white p-3 font-bold flex items-center justify-between
                                    ${p.id === user?.uid ? "ring-2 ring-blue-400" : ""}
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    {p.name}
                                    {p.id === user?.uid && (
                                        <Badge className="text-xs bg-blue-400">You</Badge>
                                    )}
                                </span>
                                {p.id === hostId && (
                                    <Badge className="text-xs bg-yellow-400">Host</Badge>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Start/Wait Message */}
                    {isHost ? (
                        <div className="space-y-2">
                            {players.length < 2 && (
                                <div className="text-center text-sm font-bold text-orange-600 bg-orange-100 p-2 border-2 border-black">
                                    ⚠️ Need at least 2 players
                                </div>
                            )}
                            <Button
                                onClick={startGame}
                                disabled={players.length < 2 || isLoading}
                                className="neo w-full bg-green-400 text-black font-black text-lg h-12"
                            >
                                {isLoading ? "Starting..." : "Start Game"}
                            </Button>
                        </div>
                    ) : (
                        <div className="text-center font-bold bg-blue-100 p-3 border-2 border-black">
                            ⏳ Waiting for host to start the game...
                        </div>
                    )}

                    {/* Leave Button */}
                    <Button
                        onClick={() => navigate("/lobby")}
                        className="w-full bg-red-400 text-black font-black"
                    >
                        Leave Room
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}