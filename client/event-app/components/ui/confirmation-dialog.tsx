import { useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
}

export function ConfirmationDialog({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
}: ConfirmationDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
				<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
					{title}
				</h3>
				<p className="text-gray-600 dark:text-gray-300 mb-6">
					{message}
				</p>
				<div className="flex justify-end gap-4">
					<Button
						variant="outline"
						onClick={onClose}
						className="text-gray-700 dark:text-gray-300 px-6 py-2 text-base rounded-lg shadow transition-all duration-200 active:scale-95 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
					>
						{cancelText}
					</Button>
					<Button
						variant="default"
						onClick={() => {
							onConfirm();
							onClose();
						}}
						className="bg-red-600 text-white px-6 py-2 text-base rounded-lg shadow hover:bg-red-700 focus:ring-2 focus:ring-red-400 focus:outline-none transition-all duration-200 active:scale-95"
					>
						{confirmText}
					</Button>
				</div>
			</div>
		</div>
	);
}
