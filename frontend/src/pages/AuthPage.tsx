import React, {
  useContext,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  AuthCard,
  AuthForm,
  AuthInput,
  AuthShell,
  BrandMark,
  BrandText,
  ErrorMessage,
  FeatureItem,
  FeatureList,
  Field,
  FormContainer,
  FormDescription,
  FormEyebrow,
  FormRegion,
  FormTitle,
  HeroBrand,
  HeroContent,
  HeroDescription,
  HeroEyebrow,
  HeroFooter,
  HeroPane,
  HeroTitle,
  Label,
  MobileBrand,
  ModeSwitch,
  PasswordField,
  PasswordInput,
  PasswordToggle,
  SecurityNote,
} from "../styles/auth";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const getAuthenticationErrorMessage = (
  error: unknown,
  isLogin: boolean
): string => {
  if (axios.isAxiosError(error)) {
    const status =
      error.response?.status;

    if (isLogin && status === 401) {
      return "Email or password is incorrect.";
    }

    if (!isLogin && status === 400) {
      return "An account with this email already exists.";
    }

    if (
      typeof status === "number" &&
      status >= 500
    ) {
      return "Authentication service is temporarily unavailable. Please try again.";
    }

    if (!error.response) {
      return "Unable to reach the authentication service. Check your connection and try again.";
    }
  }

  if (
    error instanceof Error &&
    error.message ===
      "Authentication response did not include a token"
  ) {
    return "Authentication service returned an invalid response. Please try again.";
  }

  return isLogin
    ? "Authentication failed. Please try again."
    : "Account could not be created. Please try again.";
};

const AuthPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();

  const [isLogin, setIsLogin] =
    useState(true);

  const [formData, setFormData] =
    useState<FormData>({
      email: "",
      password: "",
      confirmPassword: "",
    });

  const [error, setError] =
    useState("");

  const [submitting, setSubmitting] =
    useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  if (!auth) {
    return null;
  }

  const {
    login,
    signup,
  } = auth;

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData(
      (current) => ({
        ...current,
        [field]: value,
      })
    );

    if (error) {
      setError("");
    }
  };

  const switchMode = () => {
    setIsLogin(
      (current) => !current
    );

    setFormData(
      (current) => ({
        email: current.email,
        password: "",
        confirmPassword: "",
      })
    );

    setError("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const email =
      formData.email.trim();

    if (!email || !formData.password) {
      setError(
        "Email and password are required."
      );
      return;
    }

    if (
      !isLogin &&
      formData.password !==
        formData.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isLogin) {
        await login(
          email,
          formData.password
        );
      } else {
        await signup(
          email,
          formData.password
        );
      }

      navigate(
        "/dashboard",
        {
          replace: true,
        }
      );
    } catch (error: unknown) {
      setError(
        getAuthenticationErrorMessage(
          error,
          isLogin
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <HeroPane
        aria-label="IoT Manager introduction"
      >
        <HeroBrand>
          <BrandMark>
            IO
          </BrandMark>

          <BrandText>
            IoT Manager
          </BrandText>
        </HeroBrand>

        <HeroContent>
          <HeroEyebrow>
            Device control center
          </HeroEyebrow>

          <HeroTitle>
            Your connected workspace,
            simplified.
          </HeroTitle>

          <HeroDescription>
            Manage registered devices,
            monitor their state and keep
            your IoT workspace organized
            from a single control center.
          </HeroDescription>

          <FeatureList>
            <FeatureItem>
              Centralized device management
            </FeatureItem>

            <FeatureItem>
              Responsive desktop and mobile
              workspace
            </FeatureItem>

            <FeatureItem>
              Light and dark interface modes
            </FeatureItem>
          </FeatureList>
        </HeroContent>

        <HeroFooter>
          IoT Manager
        </HeroFooter>
      </HeroPane>

      <FormRegion>
        <FormContainer>
          <MobileBrand>
            <BrandMark>
              IO
            </BrandMark>

            <BrandText>
              IoT Manager
            </BrandText>
          </MobileBrand>

          <AuthCard>
            <FormEyebrow>
              {isLogin
                ? "Welcome back"
                : "Get started"}
            </FormEyebrow>

            <FormTitle>
              {isLogin
                ? "Sign in to your workspace"
                : "Create your account"}
            </FormTitle>

            <FormDescription>
              {isLogin
                ? "Enter your account credentials to continue to the dashboard."
                : "Create an account to start managing your IoT workspace."}
            </FormDescription>

            <AuthForm
              onSubmit={handleSubmit}
            >
              <Field>
                <Label htmlFor="auth-email">
                  Email address
                </Label>

                <AuthInput
                  id="auth-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  disabled={submitting}
                  aria-invalid={
                    Boolean(error) ||
                    undefined
                  }
                  aria-describedby={
                    error
                      ? "auth-error"
                      : undefined
                  }
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value
                    )
                  }
                />
              </Field>

              <Field>
                <Label htmlFor="auth-password">
                  Password
                </Label>

                <PasswordField>
                  <PasswordInput
                    id="auth-password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete={
                      isLogin
                        ? "current-password"
                        : "new-password"
                    }
                    placeholder="Enter your password"
                    value={formData.password}
                    disabled={submitting}
                    aria-invalid={
                      Boolean(error) ||
                      undefined
                    }
                    aria-describedby={
                      error
                        ? "auth-error"
                        : undefined
                    }
                    onChange={(event) =>
                      updateField(
                        "password",
                        event.target.value
                      )
                    }
                  />

                  <PasswordToggle
                    type="button"
                    disabled={submitting}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </PasswordToggle>
                </PasswordField>
              </Field>

              {!isLogin && (
                <Field>
                  <Label
                    htmlFor="auth-confirm-password"
                  >
                    Confirm password
                  </Label>

                  <PasswordField>
                    <PasswordInput
                      id="auth-confirm-password"
                      name="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={
                        formData.confirmPassword
                      }
                      disabled={submitting}
                      aria-invalid={
                        Boolean(error) ||
                        undefined
                      }
                      aria-describedby={
                        error
                          ? "auth-error"
                          : undefined
                      }
                      onChange={(event) =>
                        updateField(
                          "confirmPassword",
                          event.target.value
                        )
                      }
                    />

                    <PasswordToggle
                      type="button"
                      disabled={submitting}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      aria-pressed={
                        showConfirmPassword
                      }
                      onClick={() =>
                        setShowConfirmPassword(
                          (current) =>
                            !current
                        )
                      }
                    >
                      {showConfirmPassword
                        ? "Hide"
                        : "Show"}
                    </PasswordToggle>
                  </PasswordField>
                </Field>
              )}

              {error && (
                <ErrorMessage
                  id="auth-error"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </ErrorMessage>
              )}

              <Button
                type="submit"
                fullWidth
                loading={submitting}
              >
                {isLogin
                  ? "Sign in"
                  : "Create account"}
              </Button>
            </AuthForm>

            <ModeSwitch>
              {isLogin
                ? "New to IoT Manager?"
                : "Already have an account?"}{" "}
              <Button
                variant="link"
                disabled={submitting}
                onClick={switchMode}
              >
                {isLogin
                  ? "Create account"
                  : "Sign in"}
              </Button>
            </ModeSwitch>

            <SecurityNote>
              Your session is stored only
              after successful authentication.
            </SecurityNote>
          </AuthCard>
        </FormContainer>
      </FormRegion>
    </AuthShell>
  );
};

export default AuthPage;
