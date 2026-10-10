"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z
  .string()
  .min(1, { message: "Email is required." })
  .email({ message: "Please enter a valid email address." });

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const sendMagicLink = useAuthStore((s) => s.sendMagicLink);
  const init = useAuthStore((s) => s.init);
  const session = useAuthStore((s) => s.session);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (session) router.replace("/dashboard");
  }, [session, router]);

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
            Create Account
          </CardTitle>
          <p className="text-gray-600">
            Daftar tanpa password — cukup email kamu.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {sent ? (
            <div className="rounded-md px-4 py-3 text-sm bg-green-100 text-green-800 border border-green-300">
              Akun untuk <strong>{email}</strong> siap. Kami sudah kirim link
              masuk — buka email itu untuk mulai. Cek juga folder spam.
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
                {loading ? "Mengirim..." : "Daftar dengan Email"}
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
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#4A90A4] hover:underline font-medium"
              >
                Sign In
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
