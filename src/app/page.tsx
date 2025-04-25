// app/page.tsx
import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function Page() {
  return (
    <Suspense fallback={<p>로딩중…</p>}>
      <HomeClient />
    </Suspense>
  );
}
