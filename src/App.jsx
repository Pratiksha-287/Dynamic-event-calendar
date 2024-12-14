import React, { useState, useEffect, useCallback } from "react";
import { getDaysInMonth } from "./utils/dateUtils";
import "./app.css";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const App = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(() => {
    return JSON.parse(localStorage.getItem("calendarEvents")) || {};
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    name: "",
    startTime: "",
    endTime: "",
    description: "",
    type: "",
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  }, [events]);

  const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const changeMonth = (direction) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const handleDayClick = (day) => {
    const dayKey = day.toISOString().split("T")[0];
    setSelectedDay(dayKey);
    setSelectedEvent(null);
    setEventForm({ name: "", startTime: "", endTime: "", description: "", type: "" });
    setFormErrors({});
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventForm({ ...event });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!eventForm.name) errors.name = "Event name is required!";
    if (!eventForm.startTime) errors.startTime = "Start time is required!";
    if (!eventForm.endTime) errors.endTime = "End time is required!";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addEvent = () => {
    if (!validateForm()) return;

    const dayEvents = events[selectedDay] || [];
    const hasOverlap = dayEvents.some(
      (event) =>
        (event.startTime < eventForm.endTime && event.endTime > eventForm.startTime) ||
        (event.startTime === eventForm.startTime && event.endTime === eventForm.endTime)
    );

    if (hasOverlap) {
      alert("Events cannot overlap!");
      return;
    }

    const updatedEvents = {
      ...events,
      [selectedDay]: [...dayEvents, { ...eventForm }],
    };
    setEvents(updatedEvents);
    setEventForm({ name: "", startTime: "", endTime: "", description: "", type: "" });
    setFormErrors({});
  };

  const editEvent = () => {
    if (!validateForm()) return;

    const dayEvents = events[selectedDay] || [];
    const eventIndex = dayEvents.findIndex((event) => event === selectedEvent);

    if (eventIndex !== -1) {
      const updatedEvents = {
        ...events,
        [selectedDay]: [
          ...dayEvents.slice(0, eventIndex),
          { ...eventForm },
          ...dayEvents.slice(eventIndex + 1),
        ],
      };
      setEvents(updatedEvents);
      setSelectedEvent(null); // Clear selected event after editing
      setEventForm({ name: "", startTime: "", endTime: "", description: "", type: "" });
      setFormErrors({});
    }
  };

  const deleteEvent = () => {
    const dayEvents = events[selectedDay] || [];
    const updatedEvents = {
      ...events,
      [selectedDay]: dayEvents.filter((event) => event !== selectedEvent),
    };
    setEvents(updatedEvents);
    setSelectedEvent(null); // Clear selected event after deleting
    setEventForm({ name: "", startTime: "", endTime: "", description: "", type: "" });
    setFormErrors({});
  };

  const onDragEnd = useCallback(
    (result) => {
      const { source, destination } = result;

      if (!destination) return;

      const sourceDate = source.droppableId;
      const destinationDate = destination.droppableId;

      if (sourceDate === destinationDate && source.index === destination.index) return;

      const updatedEvents = { ...events };

      // Move the event from the source to the destination
      const [movedEvent] = updatedEvents[sourceDate].splice(source.index, 1);
      updatedEvents[destinationDate] = updatedEvents[destinationDate] || [];
      updatedEvents[destinationDate].splice(destination.index, 0, movedEvent);

      setEvents(updatedEvents);
    },
    [events]
  );



  const exportAsJSON = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calendar_events.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    let csv = "Date,Event Name,Start Time,End Time,Description\n";

    for (const [date, eventList] of Object.entries(events)) {
      eventList.forEach((event) => {
        csv += `${date},${event.name},${event.startTime},${event.endTime},${event.description || ""}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "calendar_events.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <h1>Dynamic Event Calendar</h1>
      <div className="calendar-controls">
        <button onClick={() => changeMonth(-1)}>Previous</button>
        <span>{currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}</span>
        <button onClick={() => changeMonth(1)}>Next</button>
      </div>

      <div className="export-buttons">
        <button onClick={() => exportAsJSON()}>Export as JSON</button>
        <button onClick={() => exportAsCSV()}>Export as CSV</button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="calendar-grid">
          {dayNames.map((day, index) => (
            <div key={index} className="day-header">
              {day}
            </div>
          ))}

          {days.map((day) => {
            const dayKey = day.toISOString().split("T")[0];
            const isCurrentDay = 
              day.getDate() === currentDate.getDate() && 
              day.getMonth() === currentDate.getMonth() &&
              day.getFullYear() === currentDate.getFullYear();

            return (
              <Droppable key={dayKey} droppableId={dayKey}>
                {(provided) => (
                  <div
                    className={`calendar-day ${dayKey === selectedDay ? "selected" : ""}  ${isCurrentDay ? "current-day" : ""}`}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    onClick={() => handleDayClick(day)}
                  >
                    <span>{day.getDate()}</span>
                    <div className="event-list">
                      {events[dayKey]?.map((event, i) => (
                        <Draggable key={`${dayKey}-${i}`} draggableId={`${dayKey}-${i}`} index={i}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`event ${event.type}`}
                              onClick={() => handleEventClick(event)}
                            >
                              {event.name} ({event.startTime} - {event.endTime})
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {selectedDay && (
        <div className="modal">
          <h2>Events for {selectedDay}</h2>

          {events[selectedDay]?.map((event, index) => (
            <div
              key={index}
              className="event-preview"
              onClick={() => handleEventClick(event)}
            >
              {event.name} ({event.startTime} - {event.endTime})
            </div>
          ))}

          <hr />

          <select
            value={eventForm.type || ""}
            onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
          >
            <option value="">Select Type</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
            <option value="other">Other</option>
          </select>
          <input
            type="text"
            placeholder="Event Name"
            value={eventForm.name}
            onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
          />
          {formErrors.name && <span className="error">{formErrors.name}</span>}
          <input
            type="time"
            value={eventForm.startTime}
            onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
          />
          {formErrors.startTime && <span className="error">{formErrors.startTime}</span>}
          <input
            type="time"
            value={eventForm.endTime}
            onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
          />
          {formErrors.endTime && <span className="error">{formErrors.endTime}</span>}
          <textarea
            placeholder="Description"
            value={eventForm.description}
            onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
          />
          <button className="submit-btn" onClick={selectedEvent ? editEvent : addEvent}>
            {selectedEvent ? "Save Changes" : "Add Event"}
          </button>
          {selectedEvent && (
            <button className="delete-btn" onClick={deleteEvent}>Delete Event</button>
          )}
          <button className="close" onClick={() => setSelectedDay(null)}>Close</button>
        </div>
      )}
    </div>
  );
};

export default App;
