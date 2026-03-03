/* eslint-disable max-lines */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: <> */
"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { type JSX, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DateInput } from "./date-input";

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange; rangeCompare?: DateRange }) => void;
  /** Initial value for start date */
  initialDateFrom?: Date | string;
  /** Initial value for end date */
  initialDateTo?: Date | string;
  /** Initial value for start date for compare */
  initialCompareFrom?: Date | string;
  /** Initial value for end date for compare */
  initialCompareTo?: Date | string;
  /** Alignment of popover */
  align?: "start" | "center" | "end";
  /** Option for locale */
  locale?: string;
  /** Option for showing compare feature */
  showCompare?: boolean;
  /** When true, "This Month" preset selects the full month; when false, selects up to today */
  fullMonthMode?: boolean;
  /** Direction of date range: "past" for historical dates, "future" for upcoming dates */
  direction?: "past" | "future";
  /** When true, future dates are disabled in the calendar */
  disableFutureDates?: boolean;
  /** When true, past dates are disabled in the calendar */
  disablePastDates?: boolean;
}

const formatDate = (date: Date, locale: string = "en-us"): string => {
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === "string") {
    // Handle empty strings - return undefined so caller can use default
    if (!dateInput || dateInput.trim() === "") {
      return new Date();
    }
    // Split the date string to get year, month, and day parts
    const parts = dateInput.split("-").map((part) => parseInt(part, 10));
    // Validate that we have valid numbers
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return new Date();
    }
    // Create a new Date object using the local timezone
    // Note: Month is 0-indexed, so subtract 1 from the month part
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date;
  } else {
    // If dateInput is already a Date object, return it directly
    return dateInput;
  }
};

interface DateRange {
  from: Date;
  to: Date | undefined;
}

interface Preset {
  name: string;
  label: string;
}

// Define presets for past direction
const PAST_PRESETS: Preset[] = [
  { name: "today", label: "Today" },
  { name: "yesterday", label: "Yesterday" },
  { name: "last7", label: "Last 7 days" },
  { name: "last14", label: "Last 14 days" },
  { name: "last30", label: "Last 30 days" },
  { name: "thisWeek", label: "This Week" },
  { name: "lastWeek", label: "Last Week" },
  { name: "thisMonth", label: "This Month" },
  { name: "lastMonth", label: "Last Month" },
  { name: "thisYear", label: "This Year" },
  { name: "lastYear", label: "Last Year" },
];

// Define presets for future direction
const FUTURE_PRESETS: Preset[] = [
  { name: "today", label: "Today" },
  { name: "tomorrow", label: "Tomorrow" },
  { name: "next7", label: "Next 7 days" },
  { name: "next30", label: "Next 30 days" },
  { name: "nextWeek", label: "Next Week" },
  { name: "nextMonth", label: "Next Month" },
  { name: "next3Months", label: "Next 3 months" },
  { name: "next6Months", label: "Next 6 months" },
  { name: "next9Months", label: "Next 9 months" },
  { name: "nextYear", label: "Next Year" },
];

/** The DateRangePicker component allows a user to select a range of dates */
export const DateRangePicker = ({
  initialDateFrom,
  initialDateTo,
  initialCompareFrom,
  initialCompareTo,
  onUpdate,
  align = "end",
  locale = "en-US",
  showCompare = true,
  fullMonthMode = false,
  direction = "past",
  disableFutureDates = false,
  disablePastDates = false,
}: DateRangePickerProps): JSX.Element => {
  // Select presets based on direction
  const PRESETS = direction === "future" ? FUTURE_PRESETS : PAST_PRESETS;
  const [isOpen, setIsOpen] = useState(false);

  // Helper to check if a date is valid (not empty string, etc.)
  const isValidInitialDate = (date: Date | string | undefined): boolean => {
    if (date === undefined) return false;
    if (typeof date === "string") return date.trim() !== "";
    return true;
  };

  // Only use today as default if initialDateFrom is explicitly provided and not empty
  const hasInitialDate = isValidInitialDate(initialDateFrom);
  const defaultFrom = hasInitialDate
    ? getDateAdjustedForTimezone(initialDateFrom as Date | string)
    : new Date(new Date().setHours(0, 0, 0, 0));

  const [range, setRange] = useState<DateRange>({
    from: defaultFrom,
    to: isValidInitialDate(initialDateTo)
      ? getDateAdjustedForTimezone(initialDateTo as Date | string)
      : hasInitialDate
      ? defaultFrom
      : undefined,
  });
  const [rangeCompare, setRangeCompare] = useState<DateRange | undefined>(
    initialCompareFrom
      ? {
          from: new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
          to: initialCompareTo
            ? new Date(new Date(initialCompareTo).setHours(0, 0, 0, 0))
            : new Date(new Date(initialCompareFrom).setHours(0, 0, 0, 0)),
        }
      : undefined
  );

  // Refs to store the values of range and rangeCompare when the date picker is opened
  const openedRangeRef = useRef<DateRange | undefined>(undefined);
  const openedRangeCompareRef = useRef<DateRange | undefined>(undefined);

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(
    undefined
  );

  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth < 960 : false
  );
  const [popoverSide, setPopoverSide] = useState<"top" | "bottom">("bottom");

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960);
    };

    window.addEventListener("resize", handleResize);

    // Clean up event listener on unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Detect when popover opens and adjust side based on available space
  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to allow DOM to render first
      const timer = setTimeout(() => {
        const trigger = document.querySelector(
          '[data-state="open"][role="button"]'
        ) as HTMLElement;
        if (trigger) {
          const triggerRect = trigger.getBoundingClientRect();
          const spaceBelow = window.innerHeight - triggerRect.bottom;
          const spaceAbove = triggerRect.top;
          const neededHeight = 450; // Approximate height of popover

          if (spaceBelow < neededHeight && spaceAbove > neededHeight) {
            setPopoverSide("top");
          } else {
            setPopoverSide("bottom");
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName);
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`);
    const from = new Date();
    const to = new Date();
    const first = from.getDate() - from.getDay();

    // PAST PRESETS
    if (direction === "past") {
      switch (preset.name) {
        case "today":
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "yesterday":
          from.setDate(from.getDate() - 1);
          from.setHours(0, 0, 0, 0);
          to.setDate(to.getDate() - 1);
          to.setHours(23, 59, 59, 999);
          break;
        case "last7":
          from.setDate(from.getDate() - 6);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "last14":
          from.setDate(from.getDate() - 13);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "last30":
          from.setDate(from.getDate() - 29);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "thisWeek":
          from.setDate(first);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "lastWeek":
          from.setDate(from.getDate() - 7 - from.getDay());
          to.setDate(to.getDate() - to.getDay() - 1);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "thisMonth":
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          if (fullMonthMode) {
            // Select entire month (last day of current month)
            to.setMonth(to.getMonth() + 1);
            to.setDate(0);
            to.setHours(23, 59, 59, 999);
          } else {
            // Select up to today
            to.setHours(23, 59, 59, 999);
          }
          break;
        case "lastMonth":
          from.setMonth(from.getMonth() - 1);
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to.setDate(0);
          to.setHours(23, 59, 59, 999);
          break;
        case "thisYear":
          from.setMonth(0);
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "lastYear":
          from.setFullYear(from.getFullYear() - 1);
          from.setMonth(0);
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to.setFullYear(to.getFullYear() - 1);
          to.setMonth(11);
          to.setDate(31);
          to.setHours(23, 59, 59, 999);
          break;
      }
    } else {
      // FUTURE PRESETS
      switch (preset.name) {
        case "today":
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "tomorrow":
          from.setDate(from.getDate() + 1);
          from.setHours(0, 0, 0, 0);
          to.setDate(to.getDate() + 1);
          to.setHours(23, 59, 59, 999);
          break;
        case "next7":
          to.setDate(to.getDate() + 6);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "next30":
          to.setDate(to.getDate() + 29);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "nextWeek":
          from.setDate(from.getDate() + (7 - from.getDay()));
          to.setDate(from.getDate() + 6);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "nextMonth":
          from.setMonth(from.getMonth() + 1);
          from.setDate(1);
          from.setHours(0, 0, 0, 0);
          to.setMonth(to.getMonth() + 1);
          to.setMonth(to.getMonth() + 1);
          to.setDate(0);
          to.setHours(23, 59, 59, 999);
          break;
        case "next3Months":
          to.setDate(to.getDate() + 89);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "next6Months":
          to.setDate(to.getDate() + 179);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "next9Months":
          to.setDate(to.getDate() + 269);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
        case "nextYear":
          to.setFullYear(to.getFullYear() + 1);
          from.setHours(0, 0, 0, 0);
          to.setHours(23, 59, 59, 999);
          break;
      }
    }

    return { from, to };
  };

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset);
    setRange(range);
    if (rangeCompare) {
      const rangeCompare = {
        from: new Date(
          range.from.getFullYear() - 1,
          range.from.getMonth(),
          range.from.getDate()
        ),
        to: range.to
          ? new Date(
              range.to.getFullYear() - 1,
              range.to.getMonth(),
              range.to.getDate()
            )
          : undefined,
      };
      setRangeCompare(rangeCompare);
    }
  };

  const checkPreset = (): void => {
    for (const preset of PRESETS) {
      const presetRange = getPresetRange(preset.name);

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      );

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      );

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name);
        return;
      }
    }

    setSelectedPreset(undefined);
  };

  const resetValues = (): void => {
    if (initialDateFrom === undefined && initialDateTo === undefined) {
      setRange({
        from: new Date(new Date().setHours(0, 0, 0, 0)),
        to: undefined,
      });
    } else {
      setRange({
        from:
          typeof initialDateFrom === "string"
            ? getDateAdjustedForTimezone(initialDateFrom)
            : initialDateFrom || new Date(new Date().setHours(0, 0, 0, 0)),
        to: initialDateTo
          ? typeof initialDateTo === "string"
            ? getDateAdjustedForTimezone(initialDateTo)
            : initialDateTo
          : typeof initialDateFrom === "string"
          ? getDateAdjustedForTimezone(initialDateFrom)
          : initialDateFrom,
      });
    }
    setRangeCompare(
      initialCompareFrom
        ? {
            from:
              typeof initialCompareFrom === "string"
                ? getDateAdjustedForTimezone(initialCompareFrom)
                : initialCompareFrom,
            to: initialCompareTo
              ? typeof initialCompareTo === "string"
                ? getDateAdjustedForTimezone(initialCompareTo)
                : initialCompareTo
              : typeof initialCompareFrom === "string"
              ? getDateAdjustedForTimezone(initialCompareFrom)
              : initialCompareFrom,
          }
        : undefined
    );
  };

  useEffect(() => {
    checkPreset();
  }, [range]);

  const PresetButton = ({
    preset,
    label,
    isSelected,
  }: {
    preset: string;
    label: string;
    isSelected: boolean;
  }): JSX.Element => (
    <Button
      className={cn(
        "justify-start h-9 px-3 text-xs cursor-pointer",
        isSelected && "pointer-events-none"
      )}
      variant="ghost"
      onClick={() => {
        setPreset(preset);
      }}
    >
      <span className={cn("pr-2 opacity-0", isSelected && "opacity-70")}>
        <CheckIcon width={16} height={16} />
      </span>
      {label}
    </Button>
  );

  // Helper function to check if two date ranges are equal
  const areRangesEqual = (a?: DateRange, b?: DateRange): boolean => {
    if (!a || !b) return a === b; // If either is undefined, return true if both are undefined
    return (
      a.from.getTime() === b.from.getTime() &&
      (!a.to || !b.to || a.to.getTime() === b.to.getTime())
    );
  };

  useEffect(() => {
    if (isOpen) {
      openedRangeRef.current = range;
      openedRangeCompareRef.current = rangeCompare;
    }
  }, [isOpen]);

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          resetValues();
        }
        setIsOpen(open);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="lg"
          variant="outline"
          className="hover:bg-white cursor-pointer"
        >
          <div className="text-right">
            <div className="py-1">
              <div>
                {range.to != null
                  ? `${formatDate(range.from, locale)} - ${formatDate(
                      range.to,
                      locale
                    )}`
                  : "Select dates..."}
              </div>
            </div>
            {rangeCompare != null && (
              <div className="opacity-60 text-xs -mt-1">
                vs. {formatDate(rangeCompare.from, locale)}
                {rangeCompare.to != null
                  ? ` - ${formatDate(rangeCompare.to, locale)}`
                  : ""}
              </div>
            )}
          </div>
          <div className="pl-1 opacity-60 -mr-2 scale-125">
            {isOpen ? (
              <ChevronUpIcon width={24} />
            ) : (
              <ChevronDownIcon width={24} />
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side={popoverSide}
        sideOffset={12}
        className="w-auto p-0 overflow-hidden flex flex-col"
      >
        {/* Scrollable Content Area - fixed height for consistent behavior */}
        <div
          className={cn("flex overflow-y-auto", isSmallScreen ? "p-2" : "p-3")}
          style={{ height: "300px" }}
        >
          {/* Preset Buttons - LEFT SIDE (desktop only) */}
          {!isSmallScreen && (
            <div className="flex flex-col gap-0.5 pr-3 border-r min-w-[120px]">
              {PRESETS.map((preset) => (
                <PresetButton
                  key={preset.name}
                  preset={preset.name}
                  label={preset.label}
                  isSelected={selectedPreset === preset.name}
                />
              ))}
            </div>
          )}

          {/* Calendar Section - RIGHT SIDE */}
          <div className={cn("flex flex-col", isSmallScreen ? "pl-2" : "pl-3")}>
            <div
              className={cn(
                "flex flex-col lg:flex-row justify-end items-center lg:items-start pb-2 lg:pb-0",
                isSmallScreen ? "gap-1" : "gap-1.5"
              )}
            >
              {showCompare && (
                <div
                  className={cn(
                    "flex items-center space-x-2",
                    isSmallScreen ? "pr-2 pb-1" : "pr-3"
                  )}
                >
                  <Switch
                    defaultChecked={Boolean(rangeCompare)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        if (!range.to) {
                          setRange({
                            from: range.from,
                            to: range.from,
                          });
                        }
                        setRangeCompare({
                          from: new Date(
                            range.from.getFullYear(),
                            range.from.getMonth(),
                            range.from.getDate() - 365
                          ),
                          to: range.to
                            ? new Date(
                                range.to.getFullYear() - 1,
                                range.to.getMonth(),
                                range.to.getDate()
                              )
                            : new Date(
                                range.from.getFullYear() - 1,
                                range.from.getMonth(),
                                range.from.getDate()
                              ),
                        });
                      } else {
                        setRangeCompare(undefined);
                      }
                    }}
                    id="compare-mode"
                  />
                  <Label htmlFor="compare-mode">Compare</Label>
                </div>
              )}
              <div
                className={cn(
                  "flex flex-col",
                  isSmallScreen ? "gap-1" : "gap-1.5"
                )}
              >
                <div
                  className={cn(
                    "flex items-center",
                    isSmallScreen ? "gap-1" : "gap-1.5"
                  )}
                >
                  <DateInput
                    value={range.from}
                    onChange={(date) => {
                      const toDate =
                        range.to == null || date > range.to ? date : range.to;
                      setRange((prevRange) => ({
                        ...prevRange,
                        from: date,
                        to: toDate,
                      }));
                    }}
                  />
                  <div className="text-sm text-muted-foreground">-</div>
                  <DateInput
                    value={range.to}
                    onChange={(date) => {
                      const fromDate = date < range.from ? date : range.from;
                      setRange((prevRange) => ({
                        ...prevRange,
                        from: fromDate,
                        to: date,
                      }));
                    }}
                  />
                </div>
                {rangeCompare != null && (
                  <div
                    className={cn(
                      "flex items-center",
                      isSmallScreen ? "gap-1" : "gap-1.5"
                    )}
                  >
                    <DateInput
                      value={rangeCompare?.from}
                      onChange={(date) => {
                        if (rangeCompare) {
                          const compareToDate =
                            rangeCompare.to == null || date > rangeCompare.to
                              ? date
                              : rangeCompare.to;
                          setRangeCompare((prevRangeCompare) => ({
                            ...prevRangeCompare,
                            from: date,
                            to: compareToDate,
                          }));
                        } else {
                          setRangeCompare({
                            from: date,
                            to: new Date(),
                          });
                        }
                      }}
                    />
                    <div className="text-sm text-muted-foreground">-</div>
                    <DateInput
                      value={rangeCompare?.to}
                      onChange={(date) => {
                        if (rangeCompare?.from) {
                          const compareFromDate =
                            date < rangeCompare.from ? date : rangeCompare.from;
                          setRangeCompare({
                            ...rangeCompare,
                            from: compareFromDate,
                            to: date,
                          });
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Preset dropdown for mobile */}
            {isSmallScreen && (
              <Select
                defaultValue={selectedPreset}
                onValueChange={(value) => {
                  setPreset(value);
                }}
              >
                <SelectTrigger className="w-full mb-1">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Calendar */}
            <div className={isSmallScreen ? "pt-1" : "pt-0"}>
              <Calendar
                mode="range"
                onSelect={(value: { from?: Date; to?: Date } | undefined) => {
                  if (value?.from != null) {
                    setRange({ from: value.from, to: value?.to });
                  }
                }}
                selected={range}
                numberOfMonths={isSmallScreen ? 1 : 2}
                disabled={
                  disableFutureDates || disablePastDates
                    ? (date: Date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (disableFutureDates && date > today) return true;
                        if (disablePastDates && date < today) return true;
                        return false;
                      }
                    : undefined
                }
                defaultMonth={
                  isSmallScreen
                    ? range.from
                    : direction === "past"
                    ? new Date(
                        range.from.getFullYear(),
                        range.from.getMonth() - 1,
                        1
                      )
                    : range.from
                }
              />
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed at Bottom */}
        <div
          className={cn(
            "flex items-center justify-end gap-2 border-t",
            isSmallScreen ? "p-2" : "p-3"
          )}
        >
          <div className={cn("flex gap-2", isSmallScreen && "w-full")}>
            <Button
              onClick={() => {
                setIsOpen(false);
                setRange({
                  from: new Date(new Date().setHours(0, 0, 0, 0)),
                  to: undefined,
                });
                setRangeCompare(undefined);
                onUpdate?.({
                  range: {
                    from: new Date(new Date().setHours(0, 0, 0, 0)),
                    to: undefined,
                  },
                  rangeCompare: undefined,
                });
              }}
              className="cursor-pointer"
              variant="outline"
              size={isSmallScreen ? "sm" : "sm"}
            >
              {isSmallScreen ? "Clear" : "Reset"}
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                resetValues();
              }}
              className="cursor-pointer"
              variant="ghost"
              size={isSmallScreen ? "sm" : "sm"}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsOpen(false);
                if (
                  !areRangesEqual(range, openedRangeRef.current) ||
                  !areRangesEqual(rangeCompare, openedRangeCompareRef.current)
                ) {
                  onUpdate?.({ range, rangeCompare });
                }
              }}
              className="cursor-pointer"
              size={isSmallScreen ? "sm" : "sm"}
            >
              Update
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
