import Link from "next/link";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function AdminDashboard() {
  const userCount = await prisma.user.count();
  const meetingCount = await prisma.meeting.count();
  const transcriptCount = await prisma.transcript.count();


  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link href="/admin/users" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Users</h2>
          <p className="text-gray-500">{userCount} users</p>
        </Link>
        <Link href="/admin/meetings" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Meetings</h2>
          <p className="text-gray-500">{meetingCount} meetings</p>
        </Link>
        <Link href="/admin/transcripts" className="p-6 bg-white rounded shadow hover:bg-gray-50">
          <h2 className="text-xl font-semibold">Transcripts</h2>
          <p className="text-gray-500">{transcriptCount} transcripts</p>
        </Link>
        
      </div>
    </div>
  );
}
