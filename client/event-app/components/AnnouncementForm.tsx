import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useSession } from "next-auth/react";

interface AnnouncementFormProps {
	eventId: number;
	onAnnouncementCreated: () => void;
	subscribers: { id: number; name: string; email: string }[];
}

export default function AnnouncementForm({
	eventId,
	onAnnouncementCreated,
	subscribers,
}: AnnouncementFormProps) {
	const [title, setTitle] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { data: session } = useSession();
	const [recipientType, setRecipientType] = useState<"all" | "selected">(
		"all"
	);
	const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!session?.user?.id) return;

		setIsSubmitting(true);
		try {
			const response = await fetch(
				`http://localhost:3001/events/${eventId}/announcements`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${session.user.accessToken}`,
					},
					body: JSON.stringify({
						title,
						message,
						recipientType,
						recipientIds:
							recipientType === "selected"
								? selectedRecipients
								: undefined,
					}),
				}
			);

			if (!response.ok) {
				throw new Error("Failed to create announcement");
			}

			// Clear form and notify parent
			setTitle("");
			setMessage("");
			setRecipientType("all");
			setSelectedRecipients([]);
			onAnnouncementCreated();
		} catch (error) {
			console.error("Error creating announcement:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4 mb-4">
			<div>
				<label
					htmlFor="title"
					className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
				>
					Title
				</label>
				<Input
					id="title"
					value={title}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
						setTitle(e.target.value)
					}
					required
					placeholder="Enter announcement title"
					className="w-full"
				/>
			</div>
			<div>
				<label
					htmlFor="message"
					className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1"
				>
					Message
				</label>
				<Textarea
					id="message"
					value={message}
					onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
						setMessage(e.target.value)
					}
					required
					placeholder="Enter announcement message"
					className="w-full min-h-[100px]"
				/>
			</div>
			<div>
				<label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
					Who should be notified?
				</label>
				<div className="flex gap-4 mb-2">
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="recipientType"
							value="all"
							checked={recipientType === "all"}
							onChange={() => setRecipientType("all")}
						/>
						<span>All attendees</span>
					</label>
					<label className="flex items-center gap-2">
						<input
							type="radio"
							name="recipientType"
							value="selected"
							checked={recipientType === "selected"}
							onChange={() => setRecipientType("selected")}
						/>
						<span>Select attendees</span>
					</label>
				</div>
				{recipientType === "selected" && (
					<div className="max-h-32 overflow-y-auto border rounded p-2 bg-slate-50 dark:bg-gray-800">
						{subscribers.map((s) => (
							<label
								key={s.id}
								className="flex items-center gap-2 mb-1"
							>
								<input
									type="checkbox"
									value={s.id}
									checked={selectedRecipients.includes(s.id)}
									onChange={(e) => {
										if (e.target.checked) {
											setSelectedRecipients((prev) => [
												...prev,
												s.id,
											]);
										} else {
											setSelectedRecipients((prev) =>
												prev.filter((id) => id !== s.id)
											);
										}
									}}
								/>
								<span>
									{s.name}{" "}
									<span className="text-xs text-slate-500">
										({s.email})
									</span>
								</span>
							</label>
						))}
					</div>
				)}
			</div>
			<Button
				type="submit"
				disabled={isSubmitting}
				className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-white font-semibold px-4 py-2 rounded-lg shadow transition-all duration-150 w-full justify-center active:scale-95 hover:scale-105 transform"
			>
				{!isSubmitting && (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				)}
				{isSubmitting ? "Creating..." : "Create Announcement"}
			</Button>
		</form>
	);
}
