import Navbar from '@/components/navbar';
import { Outlet } from "react-router";

export default function AppLayout() {
    return(
        <>
            <Navbar />
            <Outlet />
        </>
    )
}