import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {  meetings: true },
  });

  // Server action to delete a user
  async function deleteUser(formData) {
    "use server";
    const id = Number(formData.get("id"));
    if (!id) return;

    // Delete user
    try {
      await prisma.user.delete({ where: { id } });
    } catch (error) {
      console.error("Error deleting user:", error);
    }

    // Refresh page after deletion
    revalidatePath("/users");
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4 text-black">Users</h1>

      <table className="w-full table-auto border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-black">ID</th>
            <th className="border p-2 text-black">Email</th>
            <th className="border p-2 text-black">Meetings</th>
            
            
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="border p-2 text-black">{u.id}</td>
              <td className="border p-2 text-black">{u.email}</td>
              <td className="border p-2 text-black">{u.meetings.length}</td>
              
              <td className="border p-2 text-black">
                {/* Delete User Form */}
                <form action={deleteUser}>
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" className="bg-red-500 text-white px-2 py-1 rounded">
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
