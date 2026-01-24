# Agent Guidelines for HireOn.ai Frontend

This document provides coding guidelines and conventions for AI agents working in this Next.js 15 + TypeScript codebase.

## Build, Lint, and Test Commands

### Development
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run Next.js linter
```

### Notes
- No test framework configured currently
- ESLint and TypeScript errors are ignored during builds (next.config.mjs)
- To run type checking: `npx tsc --noEmit`

## Technology Stack

- **Framework**: Next.js 15.2.4 (App Router)
- **React**: 19 (latest)
- **TypeScript**: 5.x (strict mode enabled)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (no persist middleware)
- **HTTP**: Axios with interceptors
- **Forms**: React Hook Form + Zod validation
- **Icons**: lucide-react

## Project Structure

```
app/                  # Next.js App Router pages
├── layout.tsx        # Root layout
├── page.tsx          # Home page
├── dashboard/        # Job listings page
├── jobs/[id]/        # Dynamic job detail routes
├── login/            # Auth pages
├── profile/          # User profile
└── globals.css       # Global styles

components/           # Reusable components
├── ui/               # shadcn/ui primitives (51 files)
└── *.tsx             # Feature components (upload-cv, jobs-pagination, etc.)

lib/                  # Library code
├── utils.ts          # cn() utility
├── api/              # API client functions
│   ├── axiosInstance.ts
│   ├── auth.ts
│   ├── jobs.ts
│   └── profile.ts
└── utils/            # Additional utilities

store/                # Zustand state management
├── auth.ts           # Authentication
├── jobs.ts           # Job listings
├── profile.ts        # User profile
└── cv-analysis.ts    # CV analysis

hooks/                # Custom React hooks
├── use-debounce.ts
├── use-toast.ts
└── use-mobile.tsx
```

## Import Conventions

### Always Use Absolute Imports with @/ Alias
```tsx
// ✅ CORRECT
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/api/axiosInstance"

// ❌ AVOID
import { Button } from "../../components/ui/button"
import { useAuthStore } from "../store/auth"
```

### Import Order
1. React and Next.js imports
2. External libraries (alphabetical)
3. Internal components (@/components)
4. Internal stores (@/store)
5. Internal hooks (@/hooks)
6. Internal utilities (@/lib)
7. Types (use `import type` when possible)

Example:
```tsx
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/api/auth"
```

## Naming Conventions

### Files
- **kebab-case** for all files: `upload-cv.tsx`, `use-debounce.ts`, `jobs-pagination.tsx`
- **[param]** for dynamic routes: `jobs/[id]/page.tsx`
- **Special files**: `page.tsx`, `layout.tsx`, `loading.tsx` (Next.js conventions)

### Components and Types
- **PascalCase**: `Button`, `UploadCV`, `JobsPagination`
- **Interfaces/Types**: `ButtonProps`, `ProfileData`, `JobsQueryParams`

### Functions and Variables
- **camelCase**: `handleSubmit`, `getMatchScoreColor`, `fetchProfile`
- **API functions**: `loginApi`, `uploadCVApi`, `fetchJobs`
- **Hooks**: `useDebounce`, `useToast`, `useMobile`
- **Stores**: `useAuthStore`, `useProfileStore`, `useJobsStore`

## Code Style

### TypeScript
- **Strict mode** enabled - always type function parameters and return types
- **No `any`** - use `unknown` if type is truly unknown, then narrow with type guards
- **Prefer interfaces** over types for object shapes
- **Discriminated unions** for API responses:

```tsx
export interface SuccessResponse {
  success: true
  data: Job[]
}

export interface ErrorResponse {
  success: false
  message: string
  error: string
}

export type JobsResponse = SuccessResponse | ErrorResponse
```

### Components
- Use `"use client"` directive for interactive components (forms, state, effects)
- Export component props as interface
- Use React.forwardRef for components that need refs
- Prefer named exports over default exports (except page.tsx)

```tsx
"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline"
  size?: "default" | "sm" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
```

### Styling
- **Always use `cn()`** utility for conditional classes:
```tsx
<div className={cn("base-class", isActive && "active-class", className)} />
```
- Use **class-variance-authority (cva)** for variant-based styling
- Follow **Tailwind conventions**: mobile-first, use design tokens

### State Management (Zustand)
- Define interface for store state
- Methods return `Promise<{success: boolean, message: string}>`
- Call API functions from `lib/api/` - don't inline API calls in stores
- Use selectors in components: `const login = useAuthStore(state => state.login)`

```tsx
import { create } from "zustand"
import { loginApi } from "@/lib/api/auth"

interface AuthState {
  login: (username: string, password: string) => Promise<{success: boolean, message: string}>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  login: async (username, password) => {
    const res = await loginApi(username, password)
    if (res.success) {
      localStorage.setItem("token", res.data.token)
      return { success: true, message: res.message }
    }
    return { success: false, message: res.message }
  },
  logout: () => localStorage.removeItem("token")
}))
```

## Error Handling

### API Layer
- Wrap all API calls in try-catch
- Return discriminated union types
- Provide fallback error object on catch

```tsx
export async function fetchJobs(params: JobsQueryParams): Promise<JobsResponse> {
  try {
    const res = await axiosInstance.get("/jobs", { params })
    return res.data
  } catch (error: any) {
    if (error.response?.data) return error.response.data
    return {
      statusCode: 500,
      success: false,
      message: "Internal Server Error",
      error: "Internal Server Error"
    }
  }
}
```

### Store Layer
- Set loading states before async operations
- Clear loading and set error state on failure
- Handle both API errors and exceptions

```tsx
fetchJobs: async (params) => {
  set({ loading: true, error: null })
  try {
    const res = await fetchJobs(params)
    if (res.success) {
      set({ jobs: res.data, loading: false })
    } else {
      set({ jobs: [], loading: false, error: res.message })
    }
  } catch (err: any) {
    set({ jobs: [], loading: false, error: err?.message || "Failed to fetch jobs" })
  }
}
```

### Component Layer
- Use toast notifications for user feedback
- Local error state for form validation
- Show loading skeletons during data fetches

```tsx
const { toast } = useToast()

try {
  const result = await login(username, password)
  if (result.success) {
    toast({ title: "Success", description: result.message })
  } else {
    toast({ title: "Error", description: result.message, variant: "destructive" })
  }
} catch (error) {
  toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
}
```

## API Integration

### Axios Setup
- Use `axiosInstance` from `@/lib/api/axiosInstance`
- Auth token automatically added via request interceptor
- 401/403 errors trigger automatic logout via response interceptor
- Base URL from `NEXT_PUBLIC_API_URL` environment variable

### File Uploads
```tsx
export async function uploadCVApi(file: File): Promise<UploadCVResponse> {
  const formData = new FormData()
  formData.append("cv", file)
  
  const res = await axiosInstance.post("/user/upload-cv", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  })
  return res.data
}
```

## Common Patterns

### Debounced Search
```tsx
const [searchTerm, setSearchTerm] = useState("")
const debouncedSearch = useDebounce(searchTerm, 300)

useEffect(() => {
  fetchJobs({ keyword: debouncedSearch })
}, [debouncedSearch])
```

### URL State Management
Use URL params for filters/pagination that should be shareable:
```tsx
const searchParams = useSearchParams()
const router = useRouter()

const updateUrlParams = (params: Record<string, string | undefined>) => {
  const url = new URL(window.location.href)
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value)
    else url.searchParams.delete(key)
  })
  router.replace(url.pathname + url.search, { scroll: false })
}
```

### Loading States
Create skeleton components for loading states:
```tsx
{loading ? <JobListSkeleton count={5} /> : <JobList jobs={jobs} />}
```

## Important Notes

- **No test framework** - add tests before making breaking changes
- **Build errors ignored** - type check manually with `npx tsc --noEmit`
- **localStorage** used directly (no persist middleware for Zustand)
- **PWA enabled** - uses next-pwa package
- **Images unoptimized** - set in next.config.mjs
