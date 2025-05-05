// Toggle subscriber status
app.patch("/events/:id/subscribers/:userId/status", verifyJWT, async (req, res) => {
    const client = await pool.connect();
    try {
        const { id: eventId, userId } = req.params;
        const { status } = req.body;

        // Check if user is admin or speaker
        const adminResult = await client.query(
            "SELECT * FROM event_admins WHERE event_id = $1 AND user_id = $2",
            [eventId, req.user.id]
        );

        if (adminResult.rows.length === 0) {
            return res.status(403).json({ error: "Not authorized to modify subscriber status" });
        }

        // Update subscriber status
        await client.query(
            "UPDATE event_participants SET status = $1 WHERE event_id = $2 AND user_id = $3",
            [status, eventId, userId]
        );

        res.json({ message: "Subscriber status updated successfully" });
    } catch (error) {
        console.error("Error updating subscriber status:", error);
        res.status(500).json({ error: "Failed to update subscriber status" });
    } finally {
        client.release();
    }
}); 
