// src/pages/AuthPage.tsx
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import {
  Wrapper,
  VisualPane,
  FormPane,
  FormBox,
  Title,
  ToggleText,
} from "../styles/theme";

const AuthPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "user",
  });
  const [error, setError] = useState("");

  if (!auth) return null;
  const { login, signup } = auth;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.email || !formData.password) {
        setError("Email and password are required.");
        return;
      }

      if (!isLogin) {
        if (formData.password !== formData.confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        await signup(formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }

      navigate("/dashboard");
    } catch (err) {
      setError("Authentication failed. Please try again.");
    }
  };

  return (
    <Wrapper>
      <VisualPane>Manage your IoT world, anywhere.</VisualPane>
      <FormPane>
        <FormBox>
          <Title>
            {isLogin ? "Login to your account" : "Create an account"}
          </Title>
          <form onSubmit={handleSubmit}>
            <Input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              style={{ marginBottom: "1rem" }}
            />
            <br />
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              style={{ marginBottom: "1rem" }}
            />
            {!isLogin && (
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={{ marginBottom: "1rem" }}
              />
            )}
            {!isLogin && (
              <Select name="role" value={formData.role} onChange={handleChange}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Select>
            )}
            {error && (
              <p style={{ color: "red", fontSize: "0.9rem" }}>{error}</p>
            )}
            <Button type="submit" style={{ width: "100%", marginTop: "1rem" }}>
              {isLogin ? "Login" : "Sign Up"}
            </Button>
          </form>
          <ToggleText>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <Button
              variant="link"
              onClick={() => setIsLogin((prev) => !prev)}
              style={{ padding: 0, fontSize: "0.9rem" }}
            >
              {isLogin ? "Sign Up" : "Login"}
            </Button>
          </ToggleText>
        </FormBox>
      </FormPane>
    </Wrapper>
  );
};

export default AuthPage;
