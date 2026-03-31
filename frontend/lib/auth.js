import { supabase } from "./supabase";

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem("user_id");
}

export async function requireAuth(router) {
  const user = await getUser();
  if (!user) {
    router.push("/login");
    return null;
  }
  localStorage.setItem("user_id", user.id);
  return user;
}