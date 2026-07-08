import React, { useState, useEffect, useCallback } from "react";
import { Video, Plus, Edit3, Trash2, Lock, Unlock, Eye, FileText, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import apiClient from "@/lib/apiClient";
import LessonEditorModal from "@/components/studio/LessonEditorModal";

const StudioLessonsPage = () => {
  const { courses = [] } = useOutletContext() || {};
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?._id || "");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0]._id);
    }
  }, [courses, selectedCourseId]);

  const fetchLessons = useCallback(async () => {
    if (!selectedCourseId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/courses/${selectedCourseId}/lessons`);
      setLessons(res.data || []);
    } catch (err) {
      console.error("Fetch lessons error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleDeleteLesson = async (lessonId) => {
    if (!window.confirm("Are you sure you want to delete this lesson module?")) return;
    try {
      await apiClient.delete(`/lessons/${lessonId}`);
      fetchLessons();
    } catch (err) {
      alert("Failed to delete lesson.");
    }
  };

  const selectedCourseDoc = courses.find((c) => c._id === selectedCourseId);

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Lesson Curriculum Builder</h1>
          <p className="text-xs text-slate-400">Configure video lessons, markdown materials, PDF resources, and free preview access.</p>
        </div>
        
        {selectedCourseId && (
          <button
            onClick={() => {
              setSelectedLesson(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            Add New Lesson
          </button>
        )}
      </div>

      {/* Course Selector Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <label className="text-xs font-bold text-slate-300 block">Select Target Course:</label>
        <div className="flex flex-wrap gap-2">
          {courses.map((c) => (
            <button
              key={c._id}
              onClick={() => setSelectedCourseId(c._id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCourseId === c._id
                  ? "bg-indigo-600 text-white shadow-md border border-indigo-400/30"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{c.title}</span>
            </button>
          ))}

          {courses.length === 0 && (
            <span className="text-xs text-slate-500">No courses created yet. Create a course first.</span>
          )}
        </div>
      </div>

      {/* Lessons Outline list */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="font-bold text-white text-base">
            Curriculum Outline {selectedCourseDoc ? `— ${selectedCourseDoc.title}` : ""}
          </h3>
          <span className="text-xs text-slate-400 font-semibold">{lessons.length} Modules Total</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs animate-pulse">Loading curriculum...</div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson._id}
                className="p-4 bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{lesson.title}</h4>
                      {lesson.isFreePreview && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Free Preview
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{lesson.description || "No description provided."}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                      <span>Duration: {lesson.videoDuration || 15} mins</span>
                      <span>•</span>
                      <span>Resources: {Array.isArray(lesson.pdfResources) ? lesson.pdfResources.length : 0} PDFs</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setShowModal(true);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white"
                    title="Edit Lesson"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lesson._id)}
                    className="p-2 bg-slate-800 hover:bg-red-500/20 rounded-xl text-slate-400 hover:text-red-400"
                    title="Delete Lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {lessons.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-xs">
                No lessons created for this course yet. Click "Add New Lesson" above.
              </div>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <LessonEditorModal
          courseId={selectedCourseId}
          lesson={selectedLesson}
          onSuccess={fetchLessons}
          onClose={() => setShowModal(false)}
        />
      )}

    </div>
  );
};

export default StudioLessonsPage;
