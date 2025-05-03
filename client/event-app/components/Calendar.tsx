import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isWithinInterval,
} from 'date-fns';

interface Event {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    status?: "upcoming" | "ongoing" | "completed";
}

interface CalendarProps {
    events: Event[];
    onEventClick: (eventId: number) => void;
}

export default function Calendar({ events, onEventClick }: CalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const minDate = subMonths(new Date(), 1); // 1 month before current
    const maxDate = addMonths(new Date(), 2); // 2 months after current

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    });

    const goToPreviousMonth = () => {
        const newDate = subMonths(currentDate, 1);
        if (newDate >= minDate) {
            setCurrentDate(newDate);
        }
    };

    const goToNextMonth = () => {
        const newDate = addMonths(currentDate, 1);
        if (newDate <= maxDate) {
            setCurrentDate(newDate);
        }
    };

    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            return isWithinInterval(day, { start: startDate, end: endDate });
        });
    };

    const isDateInRange = (date: Date) => {
        return date >= minDate && date <= maxDate;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4">
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={goToPreviousMonth}
                    disabled={!isDateInRange(subMonths(currentDate, 1))}
                    className={`p-2 rounded-lg ${
                        isDateInRange(subMonths(currentDate, 1))
                            ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {format(currentDate, 'MMMM yyyy')}
                </h2>
                <button
                    onClick={goToNextMonth}
                    disabled={!isDateInRange(addMonths(currentDate, 1))}
                    className={`p-2 rounded-lg ${
                        isDateInRange(addMonths(currentDate, 1))
                            ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    }`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 py-2">
                        {day}
                    </div>
                ))}
                
                {daysInMonth.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toISOString()}
                            className={`min-h-[100px] p-2 border border-gray-200 dark:border-gray-700 ${
                                isCurrentMonth
                                    ? 'bg-white dark:bg-gray-800'
                                    : 'bg-gray-50 dark:bg-gray-900'
                            } ${
                                isToday
                                    ? 'ring-2 ring-indigo-600 dark:ring-indigo-500'
                                    : ''
                            }`}
                        >
                            <div className="text-right">
                                <span className={`text-sm ${
                                    isCurrentMonth
                                        ? 'text-gray-900 dark:text-gray-100'
                                        : 'text-gray-400 dark:text-gray-500'
                                }`}>
                                    {format(day, 'd')}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => onEventClick(event.id)}
                                        className={`text-xs p-1 rounded cursor-pointer truncate ${
                                            event.status === 'upcoming'
                                                ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100'
                                                : event.status === 'ongoing'
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 