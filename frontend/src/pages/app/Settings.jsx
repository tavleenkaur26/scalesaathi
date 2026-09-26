import { useEffect, useState } from "react";
import Container from "../../components/Container";
import PageHeader from "../../components/PageHeader";
import { api } from "../../api/apiClient";
import "./Settings.css";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [rulesets, setRulesets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const [me, rulesetData] = await Promise.all([
          api.me(),
          api.listRulesets(),
        ]);

        if (!mounted) return;

        setUser(me);

        const items = Array.isArray(rulesetData)
          ? rulesetData
          : rulesetData?.items || rulesetData?.rulesets || [];

        setRulesets(items);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Unable to load settings");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const activeRuleset =
    rulesets.find(
      (ruleset) =>
        ruleset.active === true ||
        ruleset.is_active === true ||
        ruleset.status === "Active"
    ) || rulesets[0];

  function handleLogout() {
    api.logout();
    window.location.href = "/login";
  }

  return (
    <Container>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Account information, laboratory configuration and system details."
      />

      {loading ? (
        <div className="settings-state">
          Loading settings...
        </div>
      ) : error ? (
        <div className="settings-state settings-state--error">
          {error}
        </div>
      ) : (
        <div className="settings-page">
          {/* Profile */}
          <section className="settings-card">
            <div className="settings-card__header">
              <div>
                <span className="settings-card__eyebrow">
                  Account
                </span>
                <h2>Profile</h2>
              </div>

              <span className="settings-status">
                Active
              </span>
            </div>

            <div className="settings-grid">
              <div className="settings-field">
                <span>Name</span>
                <strong>
                  {user?.name || user?.full_name || "—"}
                </strong>
              </div>

              <div className="settings-field">
                <span>Email</span>
                <strong>
                  {user?.email || "—"}
                </strong>
              </div>

              <div className="settings-field">
                <span>Role</span>
                <strong>
                  {user?.role || "—"}
                </strong>
              </div>

              <div className="settings-field">
                <span>User ID</span>
                <strong>
                  {user?.id ?? "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* Laboratory */}
          <section className="settings-card">
            <div className="settings-card__header">
              <div>
                <span className="settings-card__eyebrow">
                  Laboratory
                </span>
                <h2>ScaleSaathi Environment</h2>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field">
                <span>Platform</span>
                <strong>ScaleSaathi</strong>
              </div>

              <div className="settings-field">
                <span>Purpose</span>
                <strong>
                  Legal Metrology Testing
                </strong>
              </div>

              <div className="settings-field">
                <span>Compliance Standard</span>
                <strong>
                  OIML R76
                </strong>
              </div>

              <div className="settings-field">
                <span>Active Ruleset</span>
                <strong>
                  {activeRuleset?.version ||
                    activeRuleset?.name ||
                    "—"}
                </strong>
              </div>
            </div>
          </section>

          {/* System information */}
          <section className="settings-card">
            <div className="settings-card__header">
              <div>
                <span className="settings-card__eyebrow">
                  System
                </span>
                <h2>Application Information</h2>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field">
                <span>Application</span>
                <strong>ScaleSaathi</strong>
              </div>

              <div className="settings-field">
                <span>Version</span>
                <strong>1.0.0</strong>
              </div>

              <div className="settings-field">
                <span>Rules Engine</span>
                <strong>OIML R76</strong>
              </div>

              <div className="settings-field">
                <span>Authentication</span>
                <strong>JWT</strong>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="settings-card settings-card--security">
            <div className="settings-card__header">
              <div>
                <span className="settings-card__eyebrow">
                  Security
                </span>
                <h2>Account Access</h2>
              </div>
            </div>

            <div className="settings-security">
              <div>
                <strong>Signed in as</strong>
                <p>
                  {user?.email || "Current account"}
                </p>
              </div>

              <button
                type="button"
                className="settings-logout"
                onClick={handleLogout}
              >
                Log out
              </button>
            </div>
          </section>
        </div>
      )}
    </Container>
  );
}