import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router"


import { rtdb } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { onValue, ref, update } from "firebase/database"
import { generateBingoBoard } from "@/lib/generateBingoBoard"

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


    useEffect(() => {
        if (!roomId || !user) return

        const roomRef = ref(rtdb, `rooms/${roomId}`)

        // Join room
        update(ref(rtdb, `rooms/${roomId}/players/${user.uid}`), {
            name: user.displayName || "Player",
            score: 0,
        })

        onValue(roomRef, (snapshot) => {
            const data = snapshot.val()
            setHostId(data.hostId)

            const list = Object.entries(data.players || {}).map(
                ([id, value]: any) => ({
                    id,
                    name: value.name,
                })
            )

            setPlayers(list)
        })
    }, [roomId, user])

    const startGame = async () => {
        if (players.length < 2) {
            alert("Need at least 2 players")
            return
        }

        const playerIds = players.map((p) => p.id)

        const updates: any = {}

        playerIds.forEach((uid) => {
            updates[`players/${uid}/board`] = generateBingoBoard()
            updates[`players/${uid}/completedLines`] = []
            updates[`players/${uid}/bingoCount`] = 0
        })

        await update(ref(rtdb, `rooms/${roomId}`), {
            status: "playing",
            turnOrder: playerIds,
            currentTurnIndex: 0,
            drawnNumbers: [],
            lastCalledNumber: null,
        })


    }

    useEffect(() => {
        if (!roomId) return

        const roomRef = ref(rtdb, `rooms/${roomId}`)

        return onValue(roomRef, (snap) => {
            const data = snap.val()
            if (data?.status === "playing") {
                navigate(`/bingo/${roomId}`)
            }
        })
    }, [roomId])



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
                    <div className="neo p-3 bg-gray-100 font-bold text-center">
                        Room ID: {roomId}
                    </div>

                    <div className="space-y-2">
                        {players.map((p) => (
                            <div
                                key={p.id}
                                className="neo bg-white p-2 font-bold"
                            >
                                {p.name}
                                {p.id === hostId && " (Host)"}
                            </div>
                        ))}
                    </div>

                    {isHost ? (
                        <Button
                            onClick={startGame}
                            className="neo w-full bg-green-400 text-black font-black"
                        >
                            Start Game
                        </Button>
                    ) : (
                        <div className="text-center font-bold">
                            Waiting for host to start…
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
