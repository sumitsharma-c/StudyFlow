// data.js — MIET updated to show only three selected faculty + logos
newFunction();
function newFunction() {
  window.SEED = [
    {
      id: "c-miet",
      name: "Model Institute of Engineering and Technology",
      slug: "miet",
      city: "Jammu",
      state: "Jammu & Kashmir",
      affiliation: "Jammu University",
      description: "A premier engineering institute offering quality technical education, modern labs, and strong placements.",
      // MIET keeps its actual logo path
      logo: "assets/assets/assets/logos/miet-logo.png",

      courses: ["CSE", "ECE", "IT", "Civil"],

      faculty: [
        { id: "f-m2", name: "Dr. Ajit Virdi", department: "Spectroscopy", designation: "Professor", photo: "assets/faculty/dr-ajit-virdi.jpg", experience: "14 years", bio: "Specializes in spectroscopy and material characterization." },
        { id: "f-m6", name: "Dr. Ashish Kumar", department: "Mathematics", designation: "Assistant Professor", photo: "assets/faculty/dr-ashish-kumar.jpg", experience: "6 years", bio: "Coordinates mathematics lab sessions." },
        { id: "f-m11", name: "Ms. Arushi Gupta", department: "English Literature", designation: "Assistant Professor", photo: "assets/faculty/ms-arushi-gupta.jpg", experience: "3 years", bio: "Focuses on modern literature and soft skills." }
      ],

      resources: [
        {
          id: "r-m1",
          title: "CSE PYQ 2025",
          type: "pyq",
          subject: "All",
          year: 2025,
          fileUrl: "assets/pyqs.pdf"
        },
        {
          id: "r-m2",
          title: "Physics Notes 2025",
          type: "notes",
          subject: "Physics",
          year: 2025,
          fileUrl: "assets/Unit-1-MathematicalPhysics.pdf"
        }
      ]
    },

    // Your old demo college — uses generic profile.png now
    {
      id: "c-user",
      name: "Your College Name Here",
      slug: "your-college",
      city: "YourCity",
      state: "YourState",
      affiliation: "Your University / Board",
      description: "Short pitch: Department strengths, labs, top courses, placements (1-2 lines).",
      // force generic profile for non-MIET colleges
      logo: "assets/profile.png",

      courses: ["Computer Science", "Electronics", "Mechanical"],

      faculty: [
        { id: "f-u1", name: "Prof. First Last", department: "CSE", designation: "Associate Professor" },
        { id: "f-u2", name: "Dr. Second Last", department: "Mathematics", designation: "Assistant Professor" }
      ],

      resources: [
        {
          id: "r1",
          title: "CSE PYQ 2025",
          type: "pyq",
          subject: "All",
          year: 2025,
          fileUrl: "assets/pyqs.pdf"
        },
        {
          id: "r2",
          title: "Physics Notes 2025",
          type: "notes",
          subject: "Physics",
          year: 2025,
          fileUrl: "assets/Unit-1-MathematicalPhysics.pdf"
        }
      ]
    },

    // Demo college for variety — also uses generic profile.png
    {
      id: "c2",
      name: "City College of Science & Tech",
      slug: "city-college-st",
      city: "MetroTown",
      state: "State B",
      affiliation: "Metro University",
      description: "Known for vibrant student life, hands-on labs and strong placements.",
      logo: "assets/profile.png",
      courses: ["Information Technology", "Civil"],

      faculty: [
        { id: "f3", name: "Prof. Rakesh Gupta", department: "IT", designation: "Associate Professor" }
      ],

      resources: [
        {
          id: "r3",
          title: "IT PYQ 2021",
          type: "pyq",
          subject: "DBMS",
          year: 2021,
          fileUrl: "assets/sample1.pdf"
        }
      ]
    }
  ];
}
