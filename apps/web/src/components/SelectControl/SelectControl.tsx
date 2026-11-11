import * as Select from "@radix-ui/react-select";
import styles from "./SelectControl.module.css";

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectControlProps {
  id: string;
  labelledBy: string;
  value: string;
  options: readonly SelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}

export function SelectControl({
  id,
  labelledBy,
  value,
  options,
  onValueChange,
  disabled = false,
  invalid = false,
  describedBy,
  placeholder = "Select an option",
}: SelectControlProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        className={styles.trigger}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      >
        <span className={styles.value}>
          <Select.Value placeholder={placeholder} />
        </span>

        <Select.Icon className={styles.icon}>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 8 4 4 4-4" />
          </svg>
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className={styles.content}
          position="popper"
          align="start"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.ScrollUpButton className={styles.scrollButton}>
            <span aria-hidden="true">▴</span>
          </Select.ScrollUpButton>

          <Select.Viewport className={styles.viewport}>
            {options.map(option => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={styles.item}
                textValue={option.label}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className={styles.indicator}>
                  <span aria-hidden="true">✓</span>
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>

          <Select.ScrollDownButton className={styles.scrollButton}>
            <span aria-hidden="true">▾</span>
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
