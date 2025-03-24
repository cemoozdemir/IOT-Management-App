import React, { useState, useContext } from "react";
import styled from "styled-components";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: ${(props) => props.theme.mainBg};
`;

const Box = styled.div`
  background: ${(props) => props.theme.cardBg};
  padding: 2rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const ToggleText = styled.p`
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
`;

const AuthPage: React.FC = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });

  if (!auth) return null;

  const { login, signup } = auth;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await signup(formData.email, formData.password);
      }
      navigate("/dashboard");
    } catch (err) {
      console.error("Auth failed:", err);
    }
  };

  return (
    <Container>
      <Box>
        <Title>{isLogin ? "Login" : "Sign Up"}</Title>
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            style={{ marginTop: "1rem" }}
          />
          <Button type="submit" style={{ marginTop: "1.5rem", width: "100%" }}>
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
      </Box>
    </Container>
  );
};

export default AuthPage;
