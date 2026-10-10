"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { useProfileStore } from "@/store/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z
  .string()
  .min(1, { message: "Email is required." })
  .email({ message: "Please enter a valid email address." });

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const sendMagicLink = useAuthStore((s) => s.sendMagicLink);
  const init = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  const profile = useProfileStore((s) => s.profile);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (session) {
      fetchProfile();
      router.replace("/dashboard");
    }
  }, [session, profile, fetchProfile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast({
        title: "Error",
        description: parsed.error.errors.map((err) => err.message).join(", "),
        variant: "error",
      });
      return;
    }

    setLoading(true);
    const res = await sendMagicLink(parsed.data);
    setLoading(false);

    if (res.success) {
      setSent(true);
      toast({
        title: "Success",
        description: res.message,
        variant: "success",
      });
    } else {
      toast({
        title: "Error",
        description: res.message,
        variant: "error",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A90A4]/10 via-white to-[#FF8A50]/10 px-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Sign In
          </CardTitle>
          <p className="text-gray-600">
            Masukkan email kamu — kami kirim link masuk, tanpa password.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {sent ? (
            <div className="rounded-md px-4 py-3 text-sm bg-green-100 text-green-800 border border-green-300">
              Link masuk sudah dikirim ke <strong>{email}</strong>. Buka email
              itu untuk melanjutkan. Cek juga folder spam.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-[#4A90A4] to-[#FF8A50] text-white hover:from-[#FF8A50] hover:to-[#4A90A4] transition-all duration-500 font-semibold"
                disabled={loading}
              >
                {loading ? "Mengirim..." : "Kirim Link Masuk"}
              </Button>
            </form>
          )}

          {sent && (
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
            >
              Pakai email lain
            </Button>
          )}

          <div className="text-center">
            <p className="text-sm text-gray-600">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="text-[#4A90A4] hover:underline font-medium"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
