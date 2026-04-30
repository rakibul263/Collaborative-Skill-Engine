import React from "react";

const AvatarContext = React.createContext({ src: "" });

export function Avatar({ className = "", children }) {
  const source = React.Children.toArray(children).find(
    (child) => React.isValidElement(child) && child.type === AvatarImage,
  );
  const src = source && source.props ? source.props.src : "";

  return (
    <AvatarContext.Provider value={{ src }}>
      <div
        className={`relative flex shrink-0 overflow-hidden rounded-full ${className}`.trim()}
      >
        {children}
      </div>
    </AvatarContext.Provider>
  );
}

export function AvatarImage({ className = "", alt = "Avatar", src = "" }) {
  return src ? (
    <img
      className={`aspect-square h-full w-full object-cover ${className}`.trim()}
      src={src}
      alt={alt}
    />
  ) : null;
}

export function AvatarFallback({ className = "", children }) {
  const { src } = React.useContext(AvatarContext);

  if (src) return null;

  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-slate-100 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
