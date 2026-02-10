import * as React from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface CalendarProps {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
}

export function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  // Get the day of week for the first day (0 = Sunday)
  const startDay = monthStart.getDay()
  
  // Create padding for days before the month starts
  const paddingDays = Array(startDay).fill(null)
  
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
  
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }
  
  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }
  
  const handleSelectDay = (day: Date) => {
    if (disabled?.(day)) return
    onSelect?.(day)
  }
  
  return (
    <div className={cn("p-3", className)}>
      {/* Header with month navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handlePreviousMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={handleNextMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-xs text-muted-foreground font-medium">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, index) => (
          <div key={`pad-${index}`} className="h-8 w-8" />
        ))}
        {days.map((day) => {
          const isSelected = selected && isSameDay(day, selected)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isDisabled = disabled?.(day)
          const isToday = isSameDay(day, new Date())
          
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDay(day)}
              disabled={isDisabled}
              className={cn(
                "h-8 w-8 rounded-md text-sm font-normal transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                !isSelected && isToday && "bg-accent text-accent-foreground",
                !isCurrentMonth && "text-muted-foreground opacity-50",
                isDisabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}
