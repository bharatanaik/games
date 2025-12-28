import { Routes, Route } from "react-router"
import Home from "@/pages/Home"
import Login from "@/pages/Login"
import Signup from "@/pages/Signup"
import Bingo from "@/pages/Bingo"
import App from "./App"
import Lobby from "@/pages/Lobby"
import LobbyRoom from "@/pages/LobbyRoom"
import ProtectedLayout from "@/layouts/ProtectedLayout"

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<App />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route path="/" element={<Home /> }/>
                
                {/* Protected group */}
                <Route element={<ProtectedLayout />}>
                    <Route path="/lobby" element={<Lobby />} />
                    <Route path="/lobby/:roomId" element={<LobbyRoom />} />
                    <Route path="/bingo/:roomId" element={<Bingo />} />
                </Route>
            </Route>
        </Routes>
    )
}
