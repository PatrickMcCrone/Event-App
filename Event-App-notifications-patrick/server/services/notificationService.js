const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class NotificationService {
	static async createNotification(userId, eventId, message) {
		try {
			const notification = await prisma.notification.create({
				data: {
					userId: parseInt(userId),
					eventId: parseInt(eventId),
					message,
				},
			});
			return notification;
		} catch (error) {
			console.error("Error creating notification:", error);
			throw error;
		}
	}

	static async notifyEventSubscribers(eventId, message) {
		try {
			const subscriptions = await prisma.eventSubscription.findMany({
				where: {
					eventId: parseInt(eventId),
				},
			});

			const notifications = await Promise.all(
				subscriptions.map((sub) =>
					this.createNotification(sub.userId, eventId, message)
				)
			);

			return notifications;
		} catch (error) {
			console.error("Error notifying subscribers:", error);
			throw error;
		}
	}

	static async notifyEventUpdate(eventId, updateType) {
		const event = await prisma.event.findUnique({
			where: { id: parseInt(eventId) },
		});

		if (!event) return;

		let message = "";
		switch (updateType) {
			case "date":
				message = `The date for "${event.title}" has been updated`;
				break;
			case "location":
				message = `The location for "${event.title}" has been updated`;
				break;
			case "details":
				message = `The details for "${event.title}" have been updated`;
				break;
			default:
				message = `There has been an update to "${event.title}"`;
		}

		await this.notifyEventSubscribers(eventId, message);
	}

	static async notifyEventReminder(eventId) {
		const event = await prisma.event.findUnique({
			where: { id: parseInt(eventId) },
		});

		if (!event) return;

		const message = `Reminder: "${event.title}" is coming up soon!`;
		await this.notifyEventSubscribers(eventId, message);
	}
}

module.exports = NotificationService;
