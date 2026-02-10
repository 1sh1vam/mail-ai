import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon, X } from "lucide-react"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string // Format: YYYY/MM/DD
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Pick a date", 
  disabled,
  className 
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Parse the date string to Date object
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    try {
      return parse(value, "yyyy/MM/dd", new Date())
    } catch {
      return undefined
    }
  }, [value])
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, "yyyy/MM/dd"))
    } else {
      onChange(undefined)
    }
    setOpen(false)
  }
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(undefined)
  }
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal gap-2 h-8",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}
          {value && (
            <X 
              className="h-3 w-3 ml-auto opacity-50 hover:opacity-100" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
