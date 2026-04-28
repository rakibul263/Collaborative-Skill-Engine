import React from "react";

export function Select({ onValueChange, children, className = "" }) {
  const parsed = React.useMemo(() => {
    const result = { placeholder: "Select an option", items: [] };

    const walk = (nodes) => {
      React.Children.forEach(nodes, (child) => {
        if (!React.isValidElement(child)) return;

        if (child.type === SelectValue && child.props?.placeholder) {
          result.placeholder = child.props.placeholder;
        }

        if (child.type === SelectItem) {
          result.items.push({
            value: child.props.value,
            label: child.props.children,
          });
        }

        if (child.props?.children) walk(child.props.children);
      });
    };

    walk(children);
    return result;
  }, [children]);

  return (
    <div className={className}>
      <select
        defaultValue=""
        onChange={(e) => onValueChange?.(e.target.value)}
        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
      >
        <option value="" disabled>
          {parsed.placeholder}
        </option>
        {parsed.items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SelectTrigger({ children }) {
  return <>{children}</>;
}

export function SelectValue() {
  return null;
}

export function SelectContent({ children }) {
  return <>{children}</>;
}

export function SelectItem() {
  return null;
}
