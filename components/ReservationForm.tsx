'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Room } from '@/types';

interface ReservationFormProps {
  rooms: Room[];
  onReservationCreated: () => void;
  onCancel: () => void;
}

interface ReservationFormData {
  room_id: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
}

export default function ReservationForm({ rooms, onReservationCreated, onCancel }: ReservationFormProps) {
  const [formData, setFormData] = useState<ReservationFormData>({
    room_id: '',
    date: '',
    start_time: '',
    end_time: '',
    purpose: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          ...formData,
          room_id: parseInt(formData.room_id)
        })
      });

      if (response.ok) {
        onReservationCreated();
      } else {
        console.error('Failed to create reservation');
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Card className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <CardContent className="bg-white p-6 rounded-lg w-full max-w-md">
        <CardHeader>
          <CardTitle>Make Reservation</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Room</label>
            <select
              name="room_id"
              value={formData.room_id}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            >
              <option value="">Select a room</option>
              {rooms.filter(room => room.is_available).map(room => (
                <option key={room.id} value={room.id}>
                  {room.room_number} - {room.building}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Purpose</label>
            <textarea
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              required
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Reservation'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}