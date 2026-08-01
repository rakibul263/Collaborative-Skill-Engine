import useAuth from "@/hooks/useAuth";
import axios from "axios";
import React, { useState } from "react";

const FindPartners = () => {
  const { user } = useAuth();
  const [techSkills, setTechSkills] = useState([]);
  useEffect(() => {
    if (user?.email) {
      axios
        .get(`${import.meta.env.VITE_API_URL}/users?email=${user.email}`)
        .then((res) => {
          setTechSkills(res.data.techSkills);
        })
        .catch((err) => {
          console.error("Error fetching user data:", err);
        });
    }
  }, []);
  return <div></div>;
};

export default FindPartners;
