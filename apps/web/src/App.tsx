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
import "./App.css";

function App() {
  return (
    <>
      <ClerkLoading>
        <main className="loadingPage">Loading authentication…</main>
      </ClerkLoading>

      <ClerkLoaded>
        <Show when="signed-out">
          <main className="authPage">
            <section className="authCard" aria-labelledby="auth-heading">
              <div className="authContent">
                <p className="authEyebrow">Plan clearly. Ship confidently.</p>
                <h1 id="auth-heading" className="authHeading">
                  Reliable Kanban Board
                </h1>
                <p className="authDescription">
                  A focused workspace for organizing work, tracking progress,
                  and keeping every task moving forward.
                </p>

                <div className="authActions">
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="authButton authButtonPrimary"
                    >
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button
                      type="button"
                      className="authButton authButtonSecondary"
                    >
                      Create account
                    </button>
                  </SignUpButton>
                </div>
                <p className="authNote">
                  Your workspace is created automatically after sign-up.
                </p>
              </div>

              <div className="boardPreview" aria-hidden="true">
                <div className="previewHeader">
                  <span>Product roadmap</span>
                  <span className="previewDots">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div className="previewColumns">
                  {["Todo", "In progress", "Done"].map((title, index) => (
                    <div className="previewColumn" key={title}>
                      <span className="previewColumnTitle">{title}</span>
                      {index < 2 ? (
                        <span className="previewTask">
                          <span className="previewTaskLine" />
                          <span className="previewTaskLine" />
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </section>
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
