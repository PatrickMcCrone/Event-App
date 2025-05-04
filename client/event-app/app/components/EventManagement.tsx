'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface User {
  id: number;
  name: string;
  email: string;
}

interface Admin extends User {
  role: 'admin' | 'chair';
}

interface Participant extends User {
  role: 'chair' | 'presenter' | 'attendee';
  status: string;
}

interface EventManagementProps {
  eventId: number;
}

export default function EventManagement({ eventId }: EventManagementProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchAdmins();
    fetchParticipants();
  }, [eventId]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/admins`);
      if (!response.ok) throw new Error('Failed to fetch admins');
      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      setError('Failed to load admins');
      console.error(err);
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/participants`);
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      setParticipants(data);
    } catch (err) {
      setError('Failed to load participants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (userId: number, role: 'admin' | 'chair') => {
    try {
      const response = await fetch(`/api/events/${eventId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, role }),
      });

      if (!response.ok) throw new Error('Failed to add admin');
      await fetchAdmins();
    } catch (err) {
      setError('Failed to add admin');
      console.error(err);
    }
  };

  const handleAddParticipant = async (userId: number, role: 'chair' | 'presenter' | 'attendee') => {
    try {
      const response = await fetch(`/api/events/${eventId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, role }),
      });

      if (!response.ok) throw new Error('Failed to add participant');
      await fetchParticipants();
    } catch (err) {
      setError('Failed to add participant');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Admins Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Event Admins</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {admins.map((admin) => (
            <div key={admin.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{admin.name}</h3>
              <p className="text-gray-600">{admin.email}</p>
              <p className="text-sm text-blue-600">Role: {admin.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Participants Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Event Participants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map((participant) => (
            <div key={participant.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{participant.name}</h3>
              <p className="text-gray-600">{participant.email}</p>
              <p className="text-sm text-blue-600">Role: {participant.role}</p>
              <p className="text-sm text-gray-500">Status: {participant.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Add Users Section */}
      <section>
        <h2 className="text-xl font-bold mb-4">Add Users</h2>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-gray-600">{user.email}</p>
              </div>
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1"
                  onChange={(e) => handleAddAdmin(user.id, e.target.value as 'admin' | 'chair')}
                >
                  <option value="">Add as admin</option>
                  <option value="admin">Admin</option>
                  <option value="chair">Chair</option>
                </select>
                <select
                  className="border rounded px-2 py-1"
                  onChange={(e) => handleAddParticipant(user.id, e.target.value as 'chair' | 'presenter' | 'attendee')}
                >
                  <option value="">Add as participant</option>
                  <option value="chair">Chair</option>
                  <option value="presenter">Presenter</option>
                  <option value="attendee">Attendee</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
} 