import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const instagramHandleRegex = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?$/i;
const bareInstagramHandleRegex = /^@?([A-Za-z0-9._]+)$/;

export function getInstagramProfileUrl(value: string | null | undefined) {
  if (!value) return null;

  const trimmedValue = value.trim();
  const urlMatch = trimmedValue.match(instagramHandleRegex);
  if (urlMatch?.[1]) {
    return `https://www.instagram.com/${urlMatch[1]}/`;
  }

  const handleMatch = trimmedValue.match(bareInstagramHandleRegex);
  if (!handleMatch?.[1]) {
    return null;
  }

  return `https://www.instagram.com/${handleMatch[1]}/`;
}
