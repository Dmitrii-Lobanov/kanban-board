import {
  ClerkLoaded,
  ClerkLoading,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/react";
import { KanbanBoard } from "./components/KanbanBoard";
import { QueryProvider } from "./providers/query-provider";

function App() {
  return (
    <>
      <ClerkLoading>Loading authentication…</ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-out">
          <main>
            <h1>Reliable Kanban Board</h1>
            <p>Sign in or create an account to access your boards.</p>
            <SignInButton mode="modal" /> <SignUpButton mode="modal" />
          </main>
        </Show>

        <Show when="signed-in">
          <UserButton />
          <QueryProvider>
            <KanbanBoard />
          </QueryProvider>
        </Show>
      </ClerkLoaded>
    </>
  );
}

export default App;
