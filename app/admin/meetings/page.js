import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export default async function MeetingsPage() {
  const meetings = await prisma.meeting.findMany({
    include: {
      user: true,
      patient: true,
      transcripts: true,
    },
  });

  // Server action to delete a meeting
  async function deleteMeeting(formData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;

    try {
      await prisma.meeting.delete({ where: { id } });
    } catch (error) {
      console.error("Error deleting meeting:", error);
    }

    revalidatePath("/meetings");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-black">Meetings</h1>

      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Name</th>
            <th className="border p-2 text-black">User</th>
            <th className="border p-2 text-black">Patient</th>
            <th className="border p-2 text-black">Transcripts</th>
            <th className="border p-2 text-black">Actions</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((m) => (
            <tr key={m.id} className="hover:bg-gray-50 text-black">
              <td className="border p-2">{m.id}</td>
              <td className="border p-2">{m.name}</td>
              <td className="border p-2">{m.user.email}</td>
              <td className="border p-2">{m.patient?.name || "N/A"}</td>
              <td className="border p-2">{m.transcripts.length}</td>
              <td className="border p-2">
                <form action={deleteMeeting}>
                  <input type="hidden" name="id" value={m.id} />
                  <button
                    type="submit"
                    className="bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
